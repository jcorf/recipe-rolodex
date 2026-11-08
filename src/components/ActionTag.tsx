import { PenIcon, type PenIconName } from './PenIcons';

/** The form the open card's submit tag belongs to (the tag floats outside the form). */
export const FORM_ID = 'open-card-form';

/** One floating tag: a pen symbol, with its name shown on hover/focus and read out to screen readers. */
export function ActionTag({
  icon, label, tone = 'kraft', type = 'button', onClick, disabled, autoFocus, written,
}: {
  icon: PenIconName;
  label: string;
  tone?: 'kraft' | 'primary' | 'danger' | 'quiet';
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Write the name on the tag in pen instead of showing it on hover. */
  written?: boolean;
}) {
  return (
    <button
      type={type}
      form={type === 'submit' ? FORM_ID : undefined}
      className={`action-tag is-${tone} ${written ? 'is-written' : ''}`}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
    >
      <span className="tag-paper" aria-hidden="true" />
      <PenIcon name={icon} />
      <span className={written ? 'tag-written' : 'action-label'} aria-hidden="true">{label}</span>
    </button>
  );
}

