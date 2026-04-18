const REVIEW_MARKS_STORAGE_KEY = "oa-review-marks";
const REVIEW_MARKS_EVENT = "oa-review-marks-changed";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseMarkedObjectiveIds(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((item) => Number(item))
      .filter((item, index, items) => Number.isInteger(item) && item > 0 && items.indexOf(item) === index);
  } catch {
    return [];
  }
}

function dispatchReviewMarksChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(REVIEW_MARKS_EVENT));
}

export function getMarkedObjectiveIds() {
  if (!canUseStorage()) {
    return [];
  }

  return parseMarkedObjectiveIds(window.localStorage.getItem(REVIEW_MARKS_STORAGE_KEY));
}

export function setObjectiveMarked(objectiveId: number, marked: boolean) {
  if (!canUseStorage()) {
    return false;
  }

  const currentIds = new Set(getMarkedObjectiveIds());

  if (marked) {
    currentIds.add(objectiveId);
  } else {
    currentIds.delete(objectiveId);
  }

  window.localStorage.setItem(REVIEW_MARKS_STORAGE_KEY, JSON.stringify([...currentIds]));
  dispatchReviewMarksChange();
  return marked;
}

export function subscribeToReviewMarks(listener: (objectiveIds: number[]) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => {
    listener(getMarkedObjectiveIds());
  };

  window.addEventListener(REVIEW_MARKS_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(REVIEW_MARKS_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}
