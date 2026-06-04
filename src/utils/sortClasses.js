export const sortClassesNaturally = (
  classes = []
) => {
  return [...classes].sort((a, b) => {
    const aValue =
      a.class_name ||
      a.name ||
      "";

    const bValue =
      b.class_name ||
      b.name ||
      "";

    const aNumber = parseInt(
      aValue.match(/\d+/)?.[0] || 0
    );

    const bNumber = parseInt(
      bValue.match(/\d+/)?.[0] || 0
    );

    if (aNumber !== bNumber) {
      return aNumber - bNumber;
    }

    return aValue.localeCompare(
      bValue
    );
  });
};