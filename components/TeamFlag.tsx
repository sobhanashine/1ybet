import { teamFlag, teamFlagUrl } from "@/lib/teams-fa";

type Props = {
  teamName: string | null | undefined;
  flagUrl?: string | null;
  className?: string;
};

export default function TeamFlag({
  teamName,
  flagUrl,
  className = "h-5 w-auto object-contain rounded-sm shadow-sm",
}: Props) {
  const url = flagUrl || (teamName ? teamFlagUrl(teamName) : null);

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={teamName ?? "flag"}
        className={className}
        loading="lazy"
      />
    );
  }

  // Fallback to text emoji if no flag URL is found (e.g. for Windows fallbacks)
  return (
    <span className="text-xl font-normal leading-none select-none" aria-label={teamName ?? "flag"}>
      {teamFlag(teamName)}
    </span>
  );
}
