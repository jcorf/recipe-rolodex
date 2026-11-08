// Simple symbols for the open card's actions, drawn like the rest of the card: one pen,
// round ends, slightly uneven lines. 24×24, stroked in currentColor.

export const PATHS = {
  // a curving arrow tipping back down into the box
  tuck: 'M18.5 6.2c-4.6-.6-9.4.9-9.9 6.6l-.2 4.4 M5.3 14.4l3.1 3.4 3.2-3.2',
  // pencil
  edit: 'M4.6 19.6l.9-4.1L15.9 5.2l3 2.9L8.6 18.6l-4 1z M13.9 7.3l2.9 2.9 M5.6 15.6l2.8 2.8',
  // check
  save: 'M4.8 12.9l4.4 4.3c3-4.4 6.4-8 10.3-11',
  // cross
  cancel: 'M6.4 6.2c3.6 3.7 7.4 7.6 11.2 11.5 M17.6 6.3c-3.9 3.8-7.6 7.6-11.1 11.4',
  // an arrow dropping into a tray: save a copy
  export: 'M12 4.2c.1 3.5-.1 6.9 0 10.3 M8.2 11.1l3.8 3.9 3.9-3.8 M5.1 15.3c-.1 1.3 0 2.5.1 3.8 4.6.2 9.2.1 13.8-.1.1-1.2.1-2.5 0-3.7',
  // a die, five dots
  dice: 'M5.4 5.6c4.3-.3 8.7-.3 13.1 0 .3 4.3.3 8.7 0 13-4.3.3-8.7.3-13 0-.3-4.2-.3-8.6-.1-13z M9 9.1h.01 M15 9.1h.01 M12 12h.01 M9 14.9h.01 M15 14.9h.01',
  // an arrow lifting out of a tray: add a copy
  import: 'M12 14.6c.1-3.5-.1-6.9 0-10.3 M8.2 7.7l3.8-3.9 3.9 3.8 M5.1 15.3c-.1 1.3 0 2.5.1 3.8 4.6.2 9.2.1 13.8-.1.1-1.2.1-2.5 0-3.7',
  // a small chevron: more options
  more: 'M7.2 14.6c1.6-1.8 3.2-3.5 4.9-5.2 1.7 1.7 3.3 3.5 4.9 5.3',
  // a spoon: the calendar of what was cooked
  spoon: 'M12.1 3.6c2.5.1 3.9 2.2 3.9 4.5 0 2.2-1.5 3.9-3.9 4-2.5-.1-4-1.8-4-4 0-2.3 1.5-4.4 4-4.5z M12.1 12.2c-.1 2.6.2 5.3-.1 8',
  // a rubber stamp: "I cooked this"
  stamp: 'M9.3 4.4c1.8-.4 3.6-.4 5.4 0 .2 1.6-.1 3.2-.9 4.6l2.3 2.5c.2.7.2 1.3.1 2H6.8c-.1-.7 0-1.3.1-2L9.2 9c-.8-1.4-1.1-3-.9-4.6z M5.6 16.4c4.2-.2 8.6-.2 12.8 0 .1 1 .1 2 0 3-4.2.2-8.6.2-12.8 0-.1-1-.1-2 0-3z',
  // an arrow leaving a box: share
  share: 'M12 15.2c.1-3.6-.1-7.2 0-10.8 M8.2 7.9l3.8-3.9 3.9 3.8 M5.6 12.4c-.2 2.3-.1 4.6.1 6.9 4.2.2 8.4.2 12.6 0 .2-2.3.2-4.6 0-6.9',
  // two sheets: copy
  copy: 'M8.6 8.4c3.2-.2 6.5-.2 9.7 0 .2 3.3.2 6.6 0 9.9-3.2.2-6.5.2-9.7 0-.2-3.3-.2-6.6 0-9.9z M5.7 15.2c-.2-3.2-.2-6.4 0-9.6 3.1-.2 6.2-.2 9.3 0',
  // chevrons: back / forward a month
  left: 'M14.6 5.4c-2.4 2.1-4.5 4.4-6.2 6.7 1.8 2.3 3.9 4.5 6.3 6.5',
  right: 'M9.4 5.4c2.4 2.1 4.5 4.4 6.2 6.7-1.8 2.3-3.9 4.5-6.3 6.5',
  // a fork and a knife: a restaurant
  fork: 'M7.6 4.4c-.3 2.1-.3 4.1 0 5.9.1 1.1.9 1.7 1.7 1.8l-.1 7.9 M5.5 4.6c-.1 1.9-.1 3.7.1 5.5 M9.9 4.5c.1 1.9.1 3.7-.1 5.6 M16 4.3c-1.8 1.7-2.4 4.3-2 6.9.2 1 1 1.4 2 1.4l-.1 7',
  // a curved arrow turning clockwise: rotate
  turn: 'M18.3 8.2A7.2 7.2 0 1 0 19 13.6 M18.9 4.3l-.4 4.3-4.3-.4',
  // a light plus: add
  plus: 'M12 6c.1 4-.1 8 0 12 M6 12c4 .1 8-.1 12 0',
  // a minus: zoom out
  minus: 'M6 12c4 .1 8-.1 12 0',
  // a page torn across the middle
  tear: 'M7.2 3.8h9.7l.1 7.4-2.2 1.3-2-1.6-2.1 1.5-1.9-1.5-1.7 1.2z M7.1 20.3v-4.6l1.8-1.3 2 1.4 2-1.5 2.2 1.6 1.9-1.3v5.6z',
} as const;

export type PenIconName = keyof typeof PATHS;

export function PenIcon({ name }: { name: PenIconName }) {
  return (
    <svg className="pen-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
