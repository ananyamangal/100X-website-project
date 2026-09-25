import { RichContent } from "@/components/RichContent"

// The published post body wrapper. The admin editor's Preview tab renders through
// this exact component, so what an author previews is what the live page ships.
export const BLOG_BODY_CLASS =
  "blog-body text-base md:text-[1.0625rem] text-gray-800 leading-[1.8] space-y-5 overflow-x-hidden [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:mb-4 [&_ul]:pl-6 [&_ul]:space-y-2 [&_ol]:pl-6 [&_ol]:space-y-2 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-gray-900 [&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-brand-600 [&_a]:[overflow-wrap:anywhere] [&_a]:[word-break:break-word] [&_blockquote]:border-l-4 [&_blockquote]:border-green-500 [&_blockquote]:pl-5 [&_blockquote]:text-gray-600 [&_blockquote]:italic [&_blockquote]:my-6 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:max-w-full [&_code]:[word-break:break-all] [&_img]:max-w-full [&_img]:h-auto [&_iframe]:max-w-full [&_iframe]:w-full"

export function BlogBody({ html }: { html: string }) {
  return (
    <div className={BLOG_BODY_CLASS}>
      <RichContent html={html} faqAccordion />
    </div>
  )
}
