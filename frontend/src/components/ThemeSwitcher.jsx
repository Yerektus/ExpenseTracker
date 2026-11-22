import { ToggleButton, ToggleButtonGroup, Tooltip, useTheme } from "@heroui/react";
import { Display, Moon, Sun } from "@gravity-ui/icons";

const THEME_OPTIONS = [
  { id: "light", label: "Светлая тема", Icon: Sun },
  { id: "dark", label: "Тёмная тема", Icon: Moon },
  { id: "system", label: "Как в системе", Icon: Display },
];

/** Переключатель темы: светлая / тёмная / системная. Выбор сохраняется в localStorage. */
export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme("system");

  return (
    <ToggleButtonGroup
      aria-label="Тема оформления"
      size="sm"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[theme]}
      onSelectionChange={(keys) => setTheme([...keys][0])}
    >
      {THEME_OPTIONS.map(({ id, label, Icon }, index) => (
        <Tooltip key={id} delay={300}>
          <ToggleButton id={id} aria-label={label} isIconOnly>
            {index > 0 && <ToggleButtonGroup.Separator />}
            <Icon />
          </ToggleButton>
          <Tooltip.Content>{label}</Tooltip.Content>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
}
