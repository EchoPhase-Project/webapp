import { A } from '@solidjs/router';
import { IconArrowLeft } from '@shared/ui/icons';
import './back-link.scss';

/**
 * The way back to where a page sits (its list, its package), above its
 * header; also over a "not found", which has no header.
 */
export default function BackLink(props: { href: string; label: string }) {
    return (
        <A href={props.href} class="back-link">
            <IconArrowLeft aria-hidden="true" /> {props.label}
        </A>
    );
}
