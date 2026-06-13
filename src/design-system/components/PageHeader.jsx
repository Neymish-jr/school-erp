import { erp } from "../tokens";

function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className={erp.eyebrow}>{eyebrow}</p> : null}
        <h1 className={`${erp.title} ${eyebrow ? "mt-2" : ""}`}>{title}</h1>
        {description ? <p className={erp.subtitle}>{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export default PageHeader;
