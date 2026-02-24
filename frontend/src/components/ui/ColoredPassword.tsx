import { getColoredPasswords } from "../../hooks/useColoredPasswords";

const COLORS = ["#d4a843", "#5eead4"] as const;

interface Props {
  password: string;
  className?: string;
}

export default function ColoredPassword({ password, className }: Props) {
  if (!password) return null;

  const colored = getColoredPasswords();

  if (!colored) {
    return <span className={className}>{password}</span>;
  }

  return (
    <span className={className}>
      {[...password].map((char, i) => (
        <span key={i} style={{ color: COLORS[i % 2] }}>
          {char}
        </span>
      ))}
    </span>
  );
}