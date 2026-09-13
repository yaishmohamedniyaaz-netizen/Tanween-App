import lockup from "../assets/brand/tanween-lockup-currentcolor.svg?raw";
import mark from "../assets/brand/tanween-mark-currentcolor.svg?raw";

/** Trusted, bundled e1 artwork. The Platypi wordmark is supplied as outlines. */
export function Brand() {
  return (
    <div className="brand" role="img" aria-label="Tanween">
      <span
        className="brand-lockup"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: lockup }}
      />
      <span
        className="brand-mark"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: mark }}
      />
    </div>
  );
}
