import { Metadata } from "next";
import ProductPage from "./ProductPage";

const PRODUCT_META: Record<string, { title: string; description: string, keywords?: string }> = {
  "thermal-and-cold-fogging-machine-100xtfs50": {
    title: "Buy Thermal and Cold Fogging Machine | 100x Circle",
    description:
      "Buy thermal and cold fogging machines from 100x Circle. High-performance, durable foggers for mosquito control and industrial use across India. Contact us today!",
    keywords: "buy thermal and cold fogging machine, fogging machine price in india, thermal cold fogger manufacturer india, industrial thermal cold fogging machine supplier, mosquito fogging machine price, order thermal fogging machine"
  },
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400": {
    title: "Buy Double Barrel Thermal Fogging Machine | 100x Circle",
    description:
      "Buy Double Barrel Thermal Fogging Machine from 100x Circle. High-power, durable fogger for industrial mosquito control and public health use. Contact us today!",
    keywords: "buy double barrel thermal fogging machine, vehicle mounted thermal fogger manufacturer india, vehicle mounted fogging machine, heavy duty vehicle mount fogging machine supplier, double barrel fogging machine"
  },
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20": {
    title: "Buy Stainless Steel Tank Thermal Fogger | 100x Circle",
    description:
      "Buy Stainless Steel Tank Thermal Fogger from 100x Circle. Durable, rust-resistant design with powerful fog output for effective mosquito control. Contact us today!",
    keywords: " buy stainless steel tank thermal fogger, stainless steel tank fogging machine manufacturer india, SS tank thermal fogging machine supplier, stainless steel fogger price, thermal fogging machine with stainless steel tank, SS fogging machine price"
  }
};

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {

  const slug = params.slug;

  const pageMeta = PRODUCT_META[slug] || {
    title: "Product | 100xCircle",
    description: "Buy agricultural machines from 100xCircle.",
  };

  return {
    title: pageMeta.title,
    description: pageMeta.description,
    keywords: pageMeta.keywords,
    alternates: {
      canonical: `https://www.100xcircle.com/${slug}`,
    },
    openGraph: {
      title: pageMeta.title,
      description: pageMeta.description,
      url: `https://www.100xcircle.com/${slug}`,
      siteName: "100xCircle",
      type: "website",
    },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ProductPage />;
}