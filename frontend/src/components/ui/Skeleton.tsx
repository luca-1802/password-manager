import styles from "../../styles/effects.module.scss";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  className?: string;
}

export default function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  className,
}: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ""}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
      }}
      aria-hidden="true"
    />
  );
}