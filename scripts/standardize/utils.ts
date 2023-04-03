// Copy from @metamask/utils
// TODO: Needed?
export const hasProperty = <
  // eslint-disable-next-line @typescript-eslint/ban-types
  ObjectToCheck extends Object,
  Property extends PropertyKey,
>(
  objectToCheck: ObjectToCheck,
  name: Property,
): objectToCheck is ObjectToCheck &
  Record<
    Property,
    Property extends keyof ObjectToCheck ? ObjectToCheck[Property] : unknown
  > => Object.hasOwnProperty.call(objectToCheck, name);
