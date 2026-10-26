import { Dynamic } from 'solid-js/web';
import { AiOutlineGlobal, AiOutlineLink, AiOutlineLock } from 'solid-icons/ai';
import type { PackageVisibility } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';

const ICONS = {
    Private: AiOutlineLock,
    Unlisted: AiOutlineLink,
    Public: AiOutlineGlobal,
};

/** Who sees a package, as a capsule beside its name (GitHub's "Private"). */
export default function VisibilityBadge(props: {
    visibility: PackageVisibility;
}) {
    const t = useLocalizer('packages');
    return (
        <span class="visibility-badge">
            <Dynamic component={ICONS[props.visibility]} aria-hidden="true" />
            {t(`visibility.${props.visibility}`, props.visibility)}
        </span>
    );
}
