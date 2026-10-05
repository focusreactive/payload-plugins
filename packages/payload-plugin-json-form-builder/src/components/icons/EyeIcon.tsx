// Drawn on a 16×12 grid, then set into the 20×20 box every Payload icon uses, so it comes out the
// size of the ones beside it in a menu.
export const EyeIcon = ({ open }: { open: boolean }) => (
  <svg
    className="icon icon--eye"
    fill="none"
    height={20}
    viewBox="0 0 20 20"
    width={20}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="translate(2.575 4.6) scale(0.9)">
      {open ? (
        <>
          <circle className="stroke" cx="8.5" cy="6" r="2.5" />
          <path
            className="stroke"
            d="M8.5 1C3.83333 1 1.5 6 1.5 6C1.5 6 3.83333 11 8.5 11C13.1667 11 15.5 6 15.5 6C15.5 6 13.1667 1 8.5 1Z"
          />
        </>
      ) : (
        <path
          className="stroke"
          d="M2 11.5L4.35141 9.51035M15 0.5L12.6486 2.48965M10.915 6.64887C10.6493 7.64011 9.78959 8.38832 8.7408 8.48855M10.4085 4.38511C9.94992 3.84369 9.2651 3.5 8.5 3.5C7.11929 3.5 6 4.61929 6 6C6 6.61561 6.22251 7.17926 6.59149 7.61489M10.4085 4.38511L6.59149 7.61489M10.4085 4.38511L12.6486 2.48965M6.59149 7.61489L4.35141 9.51035M14.1292 3.92915C15.0431 5.02085 15.5 6 15.5 6C15.5 6 13.1667 11 8.5 11C7.67995 11 6.93195 10.8456 6.256 10.5911M4.35141 9.51035C2.45047 8.03672 1.5 6 1.5 6C1.5 6 3.83333 1 8.5 1C10.1882 1 11.5711 1.65437 12.6486 2.48965"
        />
      )}
    </g>
  </svg>
);
