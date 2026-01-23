import { GraphQLError } from '../../error/GraphQLError.js';

import type {
  FieldDefinitionNode,
  InputValueDefinitionNode,
  NameNode,
} from '../../language/ast.js';
import type { ASTVisitor } from '../../language/visitor.js';

import type { SDLValidationContext } from '../ValidationContext.js';

/**
 * Unique field definition names
 *
 * A GraphQL complex type is only valid if all its fields are uniquely named.
 */
export function UniqueFieldDefinitionNamesRule(
  context: SDLValidationContext,
): ASTVisitor {
  const knownFieldNames = new Map<string, Map<string, NameNode>>();

  return {
    InputObjectTypeDefinition: checkFieldUniqueness,
    InputObjectTypeExtension: checkFieldUniqueness,
    InterfaceTypeDefinition: checkFieldUniqueness,
    InterfaceTypeExtension: checkFieldUniqueness,
    ObjectTypeDefinition: checkFieldUniqueness,
    ObjectTypeExtension: checkFieldUniqueness,
  };

  function checkFieldUniqueness(node: {
    readonly name: NameNode;
    readonly fields?:
      | ReadonlyArray<InputValueDefinitionNode | FieldDefinitionNode>
      | undefined;
  }) {
    const typeName = node.name.value;

    let fieldNames = knownFieldNames.get(typeName);
    if (fieldNames == null) {
      fieldNames = new Map();
      knownFieldNames.set(typeName, fieldNames);
    }

    const fieldNodes = node.fields ?? [];

    for (const fieldDef of fieldNodes) {
      const fieldName = fieldDef.name.value;

      // Allow extensions to redefine existing fields for merging purposes
      // Type compatibility will be checked by other validation rules

      const knownFieldName = fieldNames.get(fieldName);
      if (knownFieldName != null) {
        context.reportError(
          new GraphQLError(
            `Field "${typeName}.${fieldName}" can only be defined once.`,
            { nodes: [knownFieldName, fieldDef.name] },
          ),
        );
      } else {
        fieldNames.set(fieldName, fieldDef.name);
      }
    }

    return false;
  }
}
