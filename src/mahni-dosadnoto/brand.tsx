import Image from "next/image";
import lockup from "../../public/brand/itt-lockup-compact.png";
import lockupOnDark from "../../public/brand/itt-lockup-compact-on-dark.png";

/** Official compact lockup. Same artwork as the site header — proportions stay intact. */
export function EventLockup({
  tone = "ink",
  height = 30,
}: {
  tone?: "ink" | "on-dark";
  height?: number;
}) {
  const src = tone === "on-dark" ? lockupOnDark : lockup;
  const width = Math.round((height * src.width) / src.height);
  return (
    <Image
      src={src}
      alt="ITT Digital Hub"
      width={width}
      height={height}
      priority
      className="md-lockup"
      style={{ height, width: "auto" }}
    />
  );
}
