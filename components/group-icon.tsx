import {
  AirplaneLanding,
  AirplaneTakeoff,
  ArrowUDownLeft,
  CalendarBlank,
  GitFork,
  House,
  Path,
  type Icon,
} from "@phosphor-icons/react";

export type GroupIconName = "route" | "leave" | "back" | "stay" | "hops" | "out" | "in";

const ICONS: Record<GroupIconName, Icon> = {
  route: Path,
  leave: CalendarBlank,
  back: ArrowUDownLeft,
  stay: House,
  hops: GitFork,
  out: AirplaneTakeoff,
  in: AirplaneLanding,
};

/** Phosphor 圖示，跟 legend 同色 */
export function GroupIcon({ name }: { name: GroupIconName }) {
  const Glyph = ICONS[name];
  return <Glyph size={16} weight="fill" aria-hidden />;
}
