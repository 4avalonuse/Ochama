export function createBounds() {
  let bounds = {
    x: { min: null, max: null },
    y: { min: null, max: null }
  };

  return {
    set(next) {
      bounds = {
        x: { min: Number(next?.x?.min), max: Number(next?.x?.max) },
        y: { min: Number(next?.y?.min), max: Number(next?.y?.max) }
      };
    },
    get() {
      return {
        x: { ...bounds.x },
        y: { ...bounds.y }
      };
    }
  };
}
