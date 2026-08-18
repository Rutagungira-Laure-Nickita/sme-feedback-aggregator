import { useEffect } from "react";

type PublicSeoProps = {
  title: string;
  description: string;
};

export function PublicSeo({ title, description }: PublicSeoProps): null {
  useEffect(() => {
    document.title = title;

    let metaDescription = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );

    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }

    metaDescription.content = description;
  }, [description, title]);

  return null;
}
