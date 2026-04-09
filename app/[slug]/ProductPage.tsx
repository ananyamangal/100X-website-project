'use client';
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, MessageCircle, Star, CheckCircle, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { X as CloseIcon } from 'lucide-react';

const badgeLogoMap: Record<string, string> = {
    'Korean Technology': '/Logos clipart 2/Korean Technology.png',
    'German Technology': '/Logos clipart 2/german technology.png',
    'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
    'GeM': '/Logos clipart 2/GeM logo.png',
    'GeM logo': '/Logos clipart 2/GeM logo.png',
    'Heavy Duty': '/Logos clipart 2/Heavy Duty.png',
    'Heavy duty': '/Logos clipart 2/Heavy Duty.png', // Case variation
    'Eco Friendly': '/Logos clipart 2/Ecofreidly.png',
    'Ecofreidly': '/Logos clipart 2/Ecofreidly.png',
    'BIS Approved': '/Logos clipart 2/BIS approved.png',
};


function getYouTubeId(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
        <header className="fixed top-0 w-full bg-white/95 backdrop-blur-md shadow-lg z-50 border-b">
            <div className="bg-green-600 text-white py-3">
                <div className="container mx-auto px-4 flex justify-center items-center">
                    <div className="flex flex-wrap items-center gap-6 text-lg font-semibold justify-center">
                        <span className="flex items-center">
                            WhatsApp Us for queries
                        </span>
                        <span className="flex items-center">
                            <MessageCircle size={18} className="mr-2" />
                            <a href="tel:+917827229116" className="underline hover:text-green-200" onClick={() => { if (typeof window !== 'undefined' && (window as any).gtag) { (window as any).gtag('event', 'conversion', { 'send_to': 'AW-17730009010/0N2CCMvmudwbELLvqYZC' }); } }}>+91 7827229116</a>
                        </span>
                        <span className="flex items-center">
                            <MessageCircle size={18} className="mr-2" />
                            <a href="tel:+918178567520" className="underline hover:text-green-200">+91 8178567520</a>
                        </span>
                    </div>
                </div>
            </div>

            <nav className="container mx-auto px-4 py-4">
                <div className="flex justify-between items-center">
                    <Link href="/" className="flex items-center space-x-3">
                        <img src="/logo-main.png" alt="100X Logo" className="w-24 h-auto" />
                        <div className="flex flex-col">
                            <span className="text-base md:text-lg text-black font-bold">Circle Pvt Ltd.</span>
                        </div>
                    </Link>

                    <div className="hidden lg:flex items-center space-x-8">
                        <Link href="/" className="font-semibold text-gray-700 hover:text-green-600 transition-colors">
                            Home
                        </Link>
                        <Link href="/products" className="text-gray-700 hover:text-green-600 transition-colors">
                            Products
                        </Link>
                        <Link href="/#contact" className="text-gray-700 hover:text-green-600 transition-colors" onClick={() => { if (typeof window !== 'undefined' && (window as any).gtag_report_conversion) { (window as any).gtag_report_conversion(); } }}>
                            Contact
                        </Link>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                                // Could link to a catalog or trigger a download; placeholder for now
                                window.open('/', '_self');
                            }}
                        >
                            <Download size={16} className="mr-2" />
                            Brochure
                        </Button>
                    </div>

                    <button className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="lg:hidden mt-4 pb-4 border-t">
                        <div className="flex flex-col space-y-4 pt-4">
                            <Link href="/" className="text-left text-green-600 font-semibold" onClick={() => setIsMenuOpen(false)}>
                                Home
                            </Link>
                            <Link href="/products" className="text-gray-700" onClick={() => setIsMenuOpen(false)}>
                                Products
                            </Link>
                            <Link
                                href="/#contact"
                                className="text-gray-700"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Contact
                            </Link>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}

interface ContentSection {
    h2: string;
    p: string[];
}

interface ProductMeta {
    content1?: ContentSection;
    content2?: ContentSection;
    content3?: ContentSection;
    content4?: ContentSection;
    content5?: ContentSection;
    content6?: ContentSection;
}

const PRODUCT_META: Record<string, ProductMeta> = {
    "thermal-and-cold-fogging-machine-100xtfs50": {
        content1: {
            h2: "Industrial Thermal Cold Fogging Machine Supplier",
            p: [
                "As a trusted industrial thermal cold fogging machine supplier, 100x Circle offers high-performance machines designed for strong fog output, durability, and ease of operation. Our models are suitable for industrial areas, municipalities, warehouses, farms, and large-scale pest control projects.",
            ]
        },
        content2: {
            h2: "Thermal Cold Fogger Manufacturer  – Wide Applications",
            p: [
                "As a leading thermal cold fogger manufacturer, 100x Circle provides machines that are widely used across multiple industries for effective fogging and disinfection.",
                "Our foggers are commonly used for public health and vector control by municipal corporations, panchayats, hospitals, schools, housing societies, parks, stadiums, and other public institutions to control mosquitoes and harmful insects.",
                "In agriculture and horticulture, the thermal and cold fogging machine helps in pest control for crop fields, greenhouses, and plantations. It is suitable for applying insecticides, fungicides, and disinfectants on crops, fruits, and vegetables.",
                "These machines are also used for warehouse and grain storage disinfection, helping maintain hygiene and prevent contamination. In animal husbandry and veterinary applications, foggers support disease prevention by controlling flies, ticks, and mosquitoes in poultry farms, dairy units, and animal shelters.",
                "For sanitization and disinfection, cold fogging allows safe indoor and outdoor treatment using water-based solutions, making it ideal for commercial and industrial Spaces."
            ]
        },
        content3: {
            h2: "Fogging Machine Product Certifications & Features",
            p: [
                "If you are looking for the best fogging machine,  100x Circle offers high-quality machines at competitive and budget-friendly rates without compromising on performance.",
                "We focus on delivering certified products that offer long-term value, efficient pest control, and cost-effective performance for both commercial and residential use. Contact us to get the latest price and bulk order details."
            ]
        },
        content4: {
            h2: "100XTFS50: Buy Thermal and Cold Fogging Machine in India",
            p: [
                "The 100XTFS50 sets itself apart with its robust technical architecture, making it a leading choice for any industrial thermal cold fogger supplier. This versatile machine boasts powerful 100XTFS50 machine specifications designed for both efficiency and durability. "
            ]
        },
        content5: {
            h2: "Applications for Your 100XTFS50 Fogging Machine: Pest Control, Disinfection, and More",
            p: [
                "The 100XTFS50 model offers a diverse range of applications, making it an indispensable tool across various sectors. As a highly effective **pest control fogger**, it excels in mosquito and vector control, playing a critical role in preventing diseases like dengue and malaria by rapidly reducing insect populations in outdoor and semi-enclosed areas. Its fine mist ensures excellent penetration and coverage, reaching hidden breeding grounds."
                , "Beyond pest management, this unit serves as a powerful **disinfection fogging machine**. It's ideal for public health sanitation in a multitude of environments, including hospitals, schools, warehouses, and offices. The ability to disperse disinfectants thoroughly helps to minimize the spread of pathogens, ensuring safer and more hygienic conditions. This **thermal cold fogger**'s versatility allows for precision in applying germicides where traditional cleaning methods may fall short."
                , "Furthermore, the 100XTFS50 is robust **agricultural fogging equipment**. Farmers can leverage it for crucial crop protection against pests and diseases, and for maintaining optimal livestock hygiene. From treating greenhouses to sanitizing barns, its efficiency helps safeguard agricultural investments and promote healthier animal environments. These varied **thermal cold fogger applications** underscore its immense value."
            ]
        },
    },
    "100xdb400-double-barrel-thermal-fogging-machine-vehicle-mountable": {
        content1: {
            h2: "Heavy Duty Vehicle Mount Fogging Machine Supplier",
            p: [
                "As a trusted heavy duty vehicle mount fogging machine supplier, 100x Circle offers powerful and reliable solutions for large-scale mosquito and pest control operations. Our vehicle mount fogging machines are specially designed for wide-area coverage, making them ideal for municipal corporations, public health departments, and industrial zones.",
                "The double barrel system ensures dense and high fog output, allowing faster treatment of cities, villages, factories, and rural areas. Built with a strong pulse jet engine and durable stainless steel components, the machine delivers long-lasting performance even in demanding field conditions.",
                "Our heavy duty vehicle mount fogging machine is suitable for public health drives, emergency vector control programs, and large outdoor fogging projects across India. With high efficiency, strong coverage, and dependable build quality, it is a practical solution for professional use.",
            ]
        },
        content2: {
            h2: "Vehicle Mounted Thermal Fogger Manufacturer - Wide Applications",
            p: [
                "Vehicle Mounted Thermal Fogger Manufacturer, designs high-performance machines built for large-area mosquito and pest control operations. Our vehicle mountable models are specially engineered to deliver dense fog output with strong coverage, making them ideal for municipal corporations, public health departments, and professional pest control agencies.",
                "The Double Barrel Thermal Fogging Machine – 100XDB400 is designed for mounting on vehicles, allowing fast movement and efficient fogging across cities, villages, industrial areas, and rural regions. Its powerful pulse jet engine technology ensures consistent performance, while the durable stainless steel components provide long service life even in demanding field conditions.",
                "We focus on quality manufacturing, reliable performance, and user-friendly operation to support large-scale vector control and emergency fogging drives across India.",
            ]
        },
        content3: {
            h2: "Double Barrel Fogging Machine Product Certifications & Features",
            p: [
                "The Double Barrel Fogging Machine is built with advanced technology and trusted certifications to ensure powerful performance and reliability for large-scale fogging operations.",
                "This machine is designed for high coverage, durability, and efficient mosquito and vector control in urban and rural areas.",
            ]
        },
        content4: {
            h2: "Introduction to the 100XDB400 Double Barrel Thermal Fogging Machine",
            p: [
                "Introducing the revolutionary 100XDB400, a premier industrial double barrel thermal fogger designed to redefine efficiency in vector control. As a leading double barrel thermal fogging machine supplier in India, 100x Circle proudly presents this heavy-duty vehicle-mounted fogging machine, engineered for demanding applications across India. Its innovative 'double barrel' capability significantly boosts output and coverage, making it the ideal vehicle-mounted thermal fogging machine India for large-scale operations. This robust vector control fogging equipment ensures unparalleled performance and reliability, solidifying its position as the top choice for industrial-grade pest management."
            ]
        },
        content5: {
            h2: "Key Features and Technical Specifications",
            p: [
                "Our heavy-duty vehicle-mounted fogging machine, specifically designed for industrial applications in India, boasts impressive technical specifications ensuring superior performance and durability. At its core lies a robust 30 HP engine, delivering exceptional power output for demanding tasks. This industrial double barrel fogger is engineered for efficiency, with optimized fuel consumption of just 2.5 liters per hour, making it an economical choice for extensive operations. It achieves an outstanding fogging output rate of 100 liters per hour, guaranteeing rapid and comprehensive treatment.",
                "The machine features a substantial fogging solution capacity of 100 liters within its corrosion-resistant stainless steel tank, complemented by a 20-liter fuel tank, allowing for extended operation without frequent refills. Its dimensions (L 1200mm, W 700mm, H 800mm) and an unladen weight of 150 kg ensure a compact yet sturdy build, facilitating straightforward vehicle mounting. The innovative double barrel system is a key advantage, amplifying coverage and efficiency by simultaneously discharging fog from two outlets, significantly reducing treatment time. This vehicle-mounted fogging equipment is built with high-grade stainless steel for enduring durability, making these thermal fogger specifications ideal for challenging environments."
            ]
        },
    },
    "thermal-fogging-machine-with-stainless-steel-tank-100xssma20": {
        content1: {
            h2: "SS Tank Thermal Fogging Machine Supplier",
            p: [
                "The SS Tank Thermal Fogging Machine is designed for powerful mosquito and pest control with long-lasting durability. Built with high-quality stainless steel tanks, this model ensures better resistance to rust and corrosion, making it ideal for regular outdoor and industrial use.",
                "This machine features a portable hand-carried design, allowing easy handling and smooth movement across different locations. As a thermal fogger, it produces dense and uniform fog that helps cover large areas effectively, making it suitable for public health drives, warehouses, farms, factories, and residential societies.",
                "In addition, this model is built for consistent field performance with low maintenance requirements. Its strong engine technology ensures efficient fuel use and steady fog output, helping professionals complete fogging operations quickly and effectively. It is a practical choice for municipalities, pest control agencies, and industrial users looking for a dependable stainless steel thermal fogging machine.",
            ]
        },
        content2: {
            h2: "Stainless Steel Tank Fogging Machine Manufacturer - Wide Applications",
            p: [
                "Stainless steel tank fogging machine manufacturer provides reliable fogging solutions for a wide range of applications across India. Our machines are widely used for public health and vector control by municipal corporations, panchayats, hospitals, schools, housing societies, parks, stadiums, and other public institutions to control mosquitoes and harmful insects effectively.",
                "In the agriculture and horticulture sector, our stainless steel tank fogging machines support pest control in crop fields, greenhouses, and plantations. They are suitable for the application of fungicides, insecticides, and disinfectants on crops, fruits, and vegetables, helping improve plant protection and productivity. The durable SS tank design ensures safe handling of chemicals and long-term performance in field conditions.",
                "These machines are also ideal for warehouse and storage disinfection, including grain silos and storage units, to maintain hygiene and prevent contamination. In animal husbandry and veterinary applications, foggers help reduce disease transmission among livestock by controlling flies, ticks, and mosquitoes in poultry farms, dairy units, animal sheds, and stables.",
            ]
        },
        content3: {
            h2: "Stainless Steel Fogger Product Certifications & Features",
            p: [
                "The Stainless Steel Fogger is built with precision technology to deliver consistent and powerful fog output for professional pest control operations. Designed for durability, its stainless steel construction ensures corrosion resistance and long-term performance in demanding field conditions.",
                "This model is suitable for government departments and authorized buyers. It is also a budget-friendly solution that offers strong performance, reliable operation, and excellent value for public health, agriculture, and industrial fogging applications across India.",
            ]
        },
        content4: {
            h2: "Product Overview: 100x Circle Stainless Steel Tank Thermal Fogger (Model 100X-SSMA20)",
            p: [
                "Discover the ultimate solution for pest control and sanitation with our 100x Circle Stainless Steel Tank Thermal Fogger (Model 100X-SSMA20)! If you're looking to Buy Stainless Steel Tank Thermal Fogger in India, this model is engineered for exceptional performance. Its robust construction ensures it is a truly durable thermal fogger India, designed to withstand rigorous use. Experience unparalleled effectiveness in various applications, from agricultural pest management to public health initiatives. This thermal fogger with stainless steel tank guarantees longevity and reliable operation, making it an indispensable tool for professionals nationwide.",
            ]
        },
        content5: {
            h2: "Why Choose Our Stainless Steel Thermal Fogger?",
            p: [
                "Choosing our thermal fogger means investing in superior quality built for Indian conditions. Our durable thermal fogger India stands out with its robust stainless steel tank, offering unparalleled corrosion resistance—a critical advantage in India's varied climates and when using diverse chemicals. This high-grade material ensures exceptional longevity and maintains hygiene, unlike less durable alternatives. Beyond the tank, the overall build quality is meticulously engineered for reliability, featuring a powerful engine designed for consistent, efficient performance. Operators will appreciate the intuitive controls, making it an incredibly user-friendly thermal fogger with stainless steel tank. This corrosion resistant equipment is not just a purchase; it's a long-term solution for effective pest and germ control.",
            ]
        },
    }
};

export default function ProductDetailPage() {
    const params = useParams();
    const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
    const [product, setProduct] = useState<any>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isZoomed, setIsZoomed] = useState(false);
    const [transformOrigin, setTransformOrigin] = useState('center center');
    const [videoClosed, setVideoClosed] = useState(false);

    const pageMeta = slug && PRODUCT_META[slug] ? PRODUCT_META[slug] : undefined;

    // Carousel auto-scroll
    useEffect(() => {
        if (!product?.imageUrls?.length) return;
        // Use product's slideshow interval or default to 3000ms (3 seconds)
        const intervalTime = product.slideshowInterval || 3000;
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % product.imageUrls.length);
        }, intervalTime);
        return () => clearInterval(interval);
    }, [product]);

    // Reset image index if product changes
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [product]);

    function decodeSlug(slug: string) {
        return slug
            .replace(/-/g, " ")
            .replace(/\band\b/g, "&")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    useEffect(() => {
        if (!slug) return;
        fetch(`/api/admin/${decodeSlug(slug)}`)
            .then(res => res.json())
            .then(data => {
                setProduct(data);
                setLoading(false);
            });
    }, [slug]);

    if (loading) return <div className="pt-40 text-center text-gray-500">Loading product...</div>;
    if (!product) return <div className="pt-40 text-center text-gray-500">Product not found.</div>;

    // Helper for images: use imageUrls if present, else fallback to imageUrl or image
    const images = product.imageUrls && product.imageUrls.length > 0
        ? product.imageUrls
        : product.imageUrl
            ? [product.imageUrl]
            : product.image
                ? [product.image]
                : [];

    // Helper for thumbnails: show up to 3, centered on current image if possible
    const getThumbnails = () => {
        if (images.length <= 3) return images;
        if (currentImageIndex === 0) return images.slice(0, 3);
        if (currentImageIndex === images.length - 1) return images.slice(-3);
        return images.slice(currentImageIndex - 1, currentImageIndex + 2);
    };
    const thumbnails = getThumbnails();

    const videoId = product.youtubeLink ? getYouTubeId(product.youtubeLink) : null;

    return (

        <div className="pt-32 min-h-screen bg-gray-50 relative">
            <Header />
            <div className="container mx-auto px-4 py-12">
                <div className="mb-8">
                    <Link href="/products">
                        <Button variant="outline" className="border-gray-600 text-gray-600 hover:bg-gray-50 bg-transparent">
                            <ChevronLeft className="mr-2" size={20} />
                            Back to Products
                        </Button>
                    </Link>
                </div>
                <div className="grid lg:grid-cols-2 gap-12 mb-16">
                    <div>
                        <div className="relative w-full flex flex-col items-center">
                            {/* Main Image */}
                            <div
                                className="relative w-full flex items-center justify-center overflow-hidden rounded-2xl"
                                onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                    const clampedX = Math.min(100, Math.max(0, x));
                                    const clampedY = Math.min(100, Math.max(0, y));
                                    setTransformOrigin(`${clampedX}% ${clampedY}%`);
                                    setIsZoomed(true);
                                }}
                                onMouseLeave={() => setIsZoomed(false)}
                            >
                                <img
                                    src={images[currentImageIndex] || '/placeholder.svg'}
                                    alt={product.name}
                                    className="max-h-[400px] w-auto h-auto object-contain transition-transform duration-200 ease-out"
                                    style={{
                                        width: '100%',
                                        transform: isZoomed ? 'scale(2)' : 'scale(1)',
                                        transformOrigin,
                                    }}
                                />
                                {/* Left/Right Arrows */}
                                {images.length > 1 && (
                                    <>
                                        <button
                                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1 shadow border border-gray-300"
                                            style={{ zIndex: 2 }}
                                            onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                                            aria-label="Previous image"
                                        >
                                            <ChevronLeft size={32} />
                                        </button>
                                        <button
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-1 shadow border border-gray-300"
                                            style={{ zIndex: 2 }}
                                            onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                                            aria-label="Next image"
                                        >
                                            <ChevronRight size={32} />
                                        </button>
                                    </>
                                )}
                            </div>
                            {/* Thumbnails */}
                            <div className="flex gap-2 mt-4 justify-center">
                                {thumbnails.slice(0, 3).map((url: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(images.indexOf(url))}
                                        className={`w-20 h-20 rounded-lg border-2 ${currentImageIndex === images.indexOf(url) ? 'border-green-600' : 'border-gray-200'}`}
                                    >
                                        <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex flex-wrap gap-3 mb-4">
                            {(product.badges || [product.badge]).map((badge, index) => (
                                <Badge
                                    key={index}
                                    className={`$${badge === 'Best Seller'
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : badge === 'Eco-Friendly'
                                            ? 'bg-green-500 hover:bg-green-600'
                                            : badge === 'New Launch'
                                                ? 'bg-blue-500 hover:bg-blue-600'
                                                : 'bg-orange-500 hover:bg-orange-600'
                                        } flex items-center gap-2 px-4 py-2 text-sm`}
                                >
                                    {badgeLogoMap[badge] && (
                                        <img src={badgeLogoMap[badge]} alt={badge + ' logo'} className="inline-block w-6 h-6 object-contain mr-1" />
                                    )}
                                    {badge}
                                </Badge>
                            ))}
                        </div>
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">{product.name}</h1>
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="flex items-center space-x-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                        size={20}
                                    />
                                ))}
                                <span className="ml-2 text-lg font-semibold">{product.rating}</span>
                                <span className="text-gray-600">({product.reviewsCount} reviews)</span>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-green-600 mb-6">{product.priceRange}</div>
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">{product.detailedDescription}</p>
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <Button
                                size="lg"
                                className="bg-green-600 hover:bg-green-700 flex-1"
                                onClick={() => window.open(`https://wa.me/91${product.whatsappNumber || '7827229116'}?text=${encodeURIComponent('Hi, I am interested in this product: ' + product.name)}`, '_blank')}
                            >
                                <MessageCircle className="mr-2" size={20} />
                                Get Quote on WhatsApp
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-green-600 text-green-600 hover:bg-green-50 bg-transparent flex-1"
                                onClick={() => {
                                    if (product.brochureUrl) {
                                        window.open(product.brochureUrl, '_blank');
                                    } else {
                                        alert('Brochure download coming soon!');
                                    }
                                }}
                            >
                                <Download className="mr-2" size={20} />
                                Download Brochure
                            </Button>
                        </div>
                    </div>
                </div>
                {pageMeta && pageMeta.content4 && (
                    < div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{pageMeta.content4.h2}</h2>
                        <div className="space-y-4">
                            {pageMeta.content4.p.map((paragraph: string, index: number) => (
                                <p key={index} className="text-gray-700 font-medium">{paragraph}</p>
                            ))}
                        </div>
                    </div>
                )}
                {pageMeta && pageMeta.content5 && (
                    < div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{pageMeta.content5.h2}</h2>
                        <div className="space-y-4">
                            {pageMeta.content5.p.map((paragraph: string, index: number) => (
                                <p key={index} className="text-gray-700 font-medium">{paragraph}</p>
                            ))}
                        </div>
                    </div>
                )}
                {pageMeta && pageMeta.content1 && (
                    < div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{pageMeta.content1.h2}</h2>
                        <div className="space-y-4">
                            {pageMeta.content1.p.map((paragraph: string, index: number) => (
                                <p key={index} className="text-gray-700 font-medium">{paragraph}</p>
                            ))}
                        </div>
                    </div>
                )}
                {/* Features & Specs */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                    <div className="grid md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Key Features</h3>
                            <div className="space-y-4">
                                {product.features?.map((feature: string, index: number) => (
                                    <div key={index} className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                                        <CheckCircle className="text-green-600" size={20} />
                                        <span className="text-gray-700 font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Technical Specifications</h3>
                            <div className="space-y-3">
                                {product.specifications?.map((spec: string, index: number) => (
                                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-gray-600">{spec.split(':')[0]}:</span>
                                        <span className="font-semibold text-gray-800">{spec.split(':')[1]}</span>
                                    </div>
                                ))}
                                {product.youtubeLink && (
                                    <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                        <span className="text-gray-600">YouTube Demo:</span>
                                        <a
                                            href={product.youtubeLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold text-blue-600 hover:text-blue-800 underline"
                                        >
                                            Watch Demo Video
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Applications */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">Applications</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {product.applications?.map((application: string, index: number) => (
                            <div key={index} className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-gray-700">{application}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {pageMeta && pageMeta.content2 && (
                    < div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{pageMeta.content2.h2}</h2>
                        <div className="space-y-4">
                            {pageMeta.content2.p.map((paragraph: string, index: number) => (
                                <p key={index} className="text-gray-700 font-medium">{paragraph}</p>
                            ))}
                        </div>
                    </div>
                )}

                {pageMeta && pageMeta.content3 && (
                    < div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{pageMeta.content3.h2}</h2>
                        <div className="space-y-4">
                            {pageMeta.content3.p.map((paragraph: string, index: number) => (
                                <p key={index} className="text-gray-700 font-medium">{paragraph}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Badges Section */}
                {(product.badges || [product.badge]).length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">Product Certifications & Features</h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(product.badges || [product.badge]).map((badge: string, index: number) => (
                                <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    {badgeLogoMap[badge] && (
                                        <img
                                            src={badgeLogoMap[badge]}
                                            alt={badge + ' logo'}
                                            className="w-8 h-8 object-contain"
                                        />
                                    )}
                                    <span className="text-gray-700 font-medium">{badge}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {
                videoId && !videoClosed && (
                    <div
                        className="fixed right-6 bottom-24 z-[51] flex flex-col items-end gap-1"
                        style={{ bottom: '7rem' }}
                    >
                        <button
                            onClick={() => setVideoClosed(true)}
                            className="rounded-full bg-black/60 text-white p-1.5 hover:bg-black/80 transition-colors -mb-1 z-10"
                            aria-label="Close video"
                        >
                            <CloseIcon size={18} />
                        </button>
                        <div className="w-[280px] sm:w-[320px] overflow-hidden rounded-xl border-2 border-white/20 shadow-2xl bg-black">
                            <div className="aspect-video w-full relative">
                                <iframe
                                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${videoId}`}
                                    title="Product video"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute inset-0 w-full h-full"
                                />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
} 