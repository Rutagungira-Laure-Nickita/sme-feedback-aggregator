type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className = ""
}: SectionHeadingProps): JSX.Element {
  return (
    <div
      className={`${
        align === "center" ? "mx-auto text-center" : ""
      } max-w-3xl ${className}`}
    >
      {eyebrow ? (
        <p className="inline-flex rounded-full bg-app-primary-soft px-3 py-1 text-xs font-black uppercase text-app-primary dark:text-indigo-100">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-4 text-3xl font-black leading-tight text-app-text sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base font-medium leading-7 text-app-text-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
