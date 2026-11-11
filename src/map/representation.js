"use strict";

// An expanded formation is represented by its command post at the same anchor.
// This is a view substitution, never a new unit, location or personnel record.
function mapUnitRepresentation(unit,expanded,hasChildren) {
  const headquarters=Boolean(expanded&&hasChildren);
  const alreadyCommand=/指挥部|统帅部|总部|司令部/.test(unit.name);
  return {
    key:headquarters?`hq:${unit.id}`:unit.id,
    headquarters,
    type:headquarters?'headquarters':unit.type==='headquarters'?'general':unit.type,
    name:headquarters&&!alreadyCommand?`${unit.name}指挥部`:unit.name
  };
}
