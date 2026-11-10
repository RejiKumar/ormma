import { useMedicines } from "../family/useMedicines";
import { useMembers } from "../family/useMembers";
import type { FamilyParent } from "../family/useParents";

export type ChecklistKey = "parent" | "medicine" | "invite";

export interface ChecklistItem {
  key: ChecklistKey;
  done: boolean;
}

export interface FirstParentChecklist {
  show: boolean;
  items: ChecklistItem[];
  /** The first item that is not done; the screen's one primary action. Null when all are done. */
  next: ChecklistKey | null;
  /** The owned parent the medicine and invite items refer to, when there is one. */
  parent: FamilyParent | null;
}

const HIDDEN: FirstParentChecklist = { show: false, items: [], next: null, parent: null };

/**
 * Derives the first-parent checklist from the parents the screen already loaded and the owned parent's
 * medicines and members; it writes nothing. Shown while
 * the user belongs to no parent, or owns a parent that has no medicine yet. A member who is not an
 * owner never sees it, because that member cannot add medicines or invite.
 */
export function useFirstParentChecklist(parents: FamilyParent[], loading: boolean): FirstParentChecklist {
  const owned = parents.find((parent) => parent.role === "owner") ?? null;
  const { medicines, loading: medicinesLoading } = useMedicines(owned?.id ?? null);
  const { members } = useMembers(owned?.id ?? null);

  if (loading) return HIDDEN;
  const make = (items: ChecklistItem[], parent: FamilyParent | null): FirstParentChecklist => ({
    show: true,
    items,
    next: items.find((item) => !item.done)?.key ?? null,
    parent,
  });

  if (parents.length === 0) {
    return make(
      [
        { key: "parent", done: false },
        { key: "medicine", done: false },
        { key: "invite", done: false },
      ],
      null,
    );
  }
  if (!owned || medicinesLoading || medicines.length > 0) return HIDDEN;
  return make(
    [
      { key: "parent", done: true },
      { key: "medicine", done: false },
      { key: "invite", done: members.length > 1 },
    ],
    owned,
  );
}
