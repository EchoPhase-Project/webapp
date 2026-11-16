// The app's icons, the only place an icon library is imported (ESLint stops
// any other): Tabler (@tabler/icons-solidjs, tabler.io/icons), one set with
// one line weight. One meaning, one icon: a lock is IconLock everywhere.
//
// An icon Tabler lacks may come from solid-icons (Feather `fi` first, it is
// the closest in style; Simple Icons `si` for brands), here and nowhere else,
// exported under a Tabler-style name (through decorative, below) with a
// note on what was looked for.
// None is needed today.
//
// Every icon is decorative by default: it renders aria-hidden="true", so a
// screen reader does not read it next to its text. An icon-only control
// takes its name on the control (aria-label), not on the icon. An icon that
// gets its own aria-hidden, aria-label, aria-labelledby or title is left
// as the caller says.
import { createComponent, mergeProps, type Component } from 'solid-js';
import {
    IconAdjustmentsHorizontal as TablerIconAdjustmentsHorizontal,
    IconApi as TablerIconApi,
    IconArrowLeft as TablerIconArrowLeft,
    IconBell as TablerIconBell,
    IconBolt as TablerIconBolt,
    IconBox as TablerIconBox,
    IconBrandGithub as TablerIconBrandGithub,
    IconCaretRightFilled as TablerIconCaretRightFilled,
    IconCheck as TablerIconCheck,
    IconChevronDown as TablerIconChevronDown,
    IconChevronUp as TablerIconChevronUp,
    IconClock as TablerIconClock,
    IconCode as TablerIconCode,
    IconCompass as TablerIconCompass,
    IconCopy as TablerIconCopy,
    IconDots as TablerIconDots,
    IconDownload as TablerIconDownload,
    IconExclamationMark as TablerIconExclamationMark,
    IconEye as TablerIconEye,
    IconEyeOff as TablerIconEyeOff,
    IconFilePlus as TablerIconFilePlus,
    IconFolder as TablerIconFolder,
    IconGitBranch as TablerIconGitBranch,
    IconHierarchy as TablerIconHierarchy,
    IconHistory as TablerIconHistory,
    IconLayoutGrid as TablerIconLayoutGrid,
    IconLink as TablerIconLink,
    IconLock as TablerIconLock,
    IconLogin as TablerIconLogin,
    IconLogout as TablerIconLogout,
    IconMoon as TablerIconMoon,
    IconNotes as TablerIconNotes,
    IconPackage as TablerIconPackage,
    IconPencil as TablerIconPencil,
    IconPinnedFilled as TablerIconPinnedFilled,
    IconPlugConnected as TablerIconPlugConnected,
    IconPlus as TablerIconPlus,
    IconSearch as TablerIconSearch,
    IconServer as TablerIconServer,
    IconSettings as TablerIconSettings,
    IconSitemap as TablerIconSitemap,
    IconSun as TablerIconSun,
    IconTags as TablerIconTags,
    IconTrash as TablerIconTrash,
    IconUpload as TablerIconUpload,
    IconUser as TablerIconUser,
    IconUsers as TablerIconUsers,
    IconWorld as TablerIconWorld,
    IconX as TablerIconX,
    type IconProps,
} from '@tabler/icons-solidjs';

export type { IconProps };

function decorative(icon: Component<IconProps>): Component<IconProps> {
    return (props) =>
        createComponent(
            icon,
            mergeProps(
                {
                    get 'aria-hidden'() {
                        const named =
                            props['aria-label'] != null ||
                            props['aria-labelledby'] != null ||
                            props.title != null;
                        return named ? undefined : ('true' as const);
                    },
                },
                props
            )
        );
}

export const IconAdjustmentsHorizontal = /* @__PURE__ */ decorative(
    TablerIconAdjustmentsHorizontal
);
export const IconApi = /* @__PURE__ */ decorative(TablerIconApi);
export const IconArrowLeft = /* @__PURE__ */ decorative(TablerIconArrowLeft);
export const IconBell = /* @__PURE__ */ decorative(TablerIconBell);
export const IconBolt = /* @__PURE__ */ decorative(TablerIconBolt);
export const IconBox = /* @__PURE__ */ decorative(TablerIconBox);
export const IconBrandGithub = /* @__PURE__ */ decorative(
    TablerIconBrandGithub
);
export const IconCaretRightFilled = /* @__PURE__ */ decorative(
    TablerIconCaretRightFilled
);
export const IconCheck = /* @__PURE__ */ decorative(TablerIconCheck);
export const IconChevronDown = /* @__PURE__ */ decorative(
    TablerIconChevronDown
);
export const IconChevronUp = /* @__PURE__ */ decorative(TablerIconChevronUp);
export const IconClock = /* @__PURE__ */ decorative(TablerIconClock);
export const IconCode = /* @__PURE__ */ decorative(TablerIconCode);
export const IconCompass = /* @__PURE__ */ decorative(TablerIconCompass);
export const IconCopy = /* @__PURE__ */ decorative(TablerIconCopy);
export const IconDots = /* @__PURE__ */ decorative(TablerIconDots);
export const IconDownload = /* @__PURE__ */ decorative(TablerIconDownload);
export const IconExclamationMark = /* @__PURE__ */ decorative(
    TablerIconExclamationMark
);
export const IconEye = /* @__PURE__ */ decorative(TablerIconEye);
export const IconEyeOff = /* @__PURE__ */ decorative(TablerIconEyeOff);
export const IconFilePlus = /* @__PURE__ */ decorative(TablerIconFilePlus);
export const IconFolder = /* @__PURE__ */ decorative(TablerIconFolder);
export const IconGitBranch = /* @__PURE__ */ decorative(TablerIconGitBranch);
export const IconHierarchy = /* @__PURE__ */ decorative(TablerIconHierarchy);
export const IconHistory = /* @__PURE__ */ decorative(TablerIconHistory);
export const IconLayoutGrid = /* @__PURE__ */ decorative(TablerIconLayoutGrid);
export const IconLink = /* @__PURE__ */ decorative(TablerIconLink);
export const IconLock = /* @__PURE__ */ decorative(TablerIconLock);
export const IconLogin = /* @__PURE__ */ decorative(TablerIconLogin);
export const IconLogout = /* @__PURE__ */ decorative(TablerIconLogout);
export const IconMoon = /* @__PURE__ */ decorative(TablerIconMoon);
export const IconNotes = /* @__PURE__ */ decorative(TablerIconNotes);
export const IconPackage = /* @__PURE__ */ decorative(TablerIconPackage);
export const IconPencil = /* @__PURE__ */ decorative(TablerIconPencil);
export const IconPinnedFilled = /* @__PURE__ */ decorative(
    TablerIconPinnedFilled
);
export const IconPlugConnected = /* @__PURE__ */ decorative(
    TablerIconPlugConnected
);
export const IconPlus = /* @__PURE__ */ decorative(TablerIconPlus);
export const IconSearch = /* @__PURE__ */ decorative(TablerIconSearch);
export const IconServer = /* @__PURE__ */ decorative(TablerIconServer);
export const IconSettings = /* @__PURE__ */ decorative(TablerIconSettings);
export const IconSitemap = /* @__PURE__ */ decorative(TablerIconSitemap);
export const IconSun = /* @__PURE__ */ decorative(TablerIconSun);
export const IconTags = /* @__PURE__ */ decorative(TablerIconTags);
export const IconTrash = /* @__PURE__ */ decorative(TablerIconTrash);
export const IconUpload = /* @__PURE__ */ decorative(TablerIconUpload);
export const IconUser = /* @__PURE__ */ decorative(TablerIconUser);
export const IconUsers = /* @__PURE__ */ decorative(TablerIconUsers);
export const IconWorld = /* @__PURE__ */ decorative(TablerIconWorld);
export const IconX = /* @__PURE__ */ decorative(TablerIconX);
