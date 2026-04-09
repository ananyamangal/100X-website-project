import { Metadata } from "next";
import ProductPage from "./ProductPage";

const PRODUCT_META: Record<string, { title: string; description: string, keywords?: string }> = {
  "thermal-and-cold-fogging-machine-100xtfs50": {
    title: "Industrial Thermal & Cold Fogging Machine 100XTFS50",
    description:
      "Get the 100XTFS50 by 100x Circle a high-performance industrial thermal and cold fogger for mosquito control, agriculture, and disinfection across India. Shop now!",
    keywords: "Buy Thermal and Cold Fogging Machine,thermal cold fogger manufacturer india,buy thermal cold fogger India,industrial thermal cold fogger supplier,best thermal cold fogging machine India,industrial thermal fogging machine suppliers India,agricultural fogging equipment,disinfection fogging machine,pest control fogger,buy fogging machine online India"
  },
  "100xdb400-double-barrel-thermal-fogging-machine-vehicle-mountable": {
    title: "Buy 100XDB400 Heavy Duty Vehicle Mounted Thermal Fogger",
    description:
      "As a top double barrel thermal fogging machine supplier in India, 100x Circle offers the 100XDB400 vehicle-mounted fogger. Enhance your vector control & public health efforts. Get a quote today!",
    keywords: "double barrel thermal fogging machine supplier India,heavy duty vehicle mounted fogging machine India,buy double barrel fogger online India,vehicle- mounted thermal fogging machine India,heavy duty vehicle mount fogger supplier,industrial double barrel fogger,industrial thermal fogging solutions,vector control fogging equipment,best double barrel thermal fogger India,industrial thermal fogging machine supplier India,vehicle mounted fogging equipment,mosquito control fogging machine India,public health fogging solutions"
  },
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20": {
    title: "Buy Stainless Steel Thermal Fogger : 100X-SSMA20",
    description:
      "Need a robust thermal fogger? 100x Circle offers the 100X-SSMA20 with a durable stainless steel tank for pest control & agriculture in India. Buy now!",
    keywords: "Buy Stainless Steel Tank Thermal Fogger,stainless steel fogging machine supplier India,pest control fogger India,agricultural fogging equipment,fogger machine for mosquitoes,mosquito and pest control equipment,fogger machine for disinfection India,high capacity thermal fogger,buy SS tank fogging machine India,thermal fogger with stainless steel tank,industrial stainless steel fogger India,durable thermal fogger India,commercial thermal fogger India"
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