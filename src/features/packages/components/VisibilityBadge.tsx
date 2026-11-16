import { Dynamic } from 'solid-js/web';
import { IconLink, IconLock, IconWorld } from '@shared/ui/icons';
import type { PackageVisibility } from '@shared/api/types';
import { useLocalizer } from '@shared/i18n/i18n-context';

const ICONS = {
    Private: IconLock,
    Unlisted: IconLink,
    Public: IconWorld,
};

/** Who sees a package, as a capsule beside its name (GitHub's "Private"). */
export default function VisibilityBadge(props: {
    visibility: PackageVisibility;
}) {
    const t = useLocalizer('packages');
    return (
        <span class="visibility-badge">
            <Dynamic component={ICONS[props.visibility]} />
            {t(`visibility.${props.visibility}`, props.visibility)}
        </span>
    );
}
