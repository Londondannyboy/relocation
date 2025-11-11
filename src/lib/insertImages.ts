/**
 * Intelligently insert images into HTML content before H2 and H3 headings
 *
 * This utility parses HTML content and inserts images before strategic headings
 * to create a visually rich article experience.
 *
 * @param html - The HTML content to enhance with images
 * @param images - Object containing image URLs (content, content2, content3, content4)
 * @param legacyImages - Object containing legacy image URLs from the database
 * @returns Enhanced HTML with images inserted
 */
export function insertImagesIntoHTML(
  html: string,
  images: { content?: string; content2?: string; content3?: string; content4?: string } | null,
  legacyImages: {
    content_image_legacy?: { url?: string; alt?: string };
    content2_image_legacy?: { url?: string; alt?: string };
    content3_image_legacy?: { url?: string; alt?: string };
    content4_image_legacy?: { url?: string; alt?: string };
  } = {}
): string {
  // Collect all available images
  const availableImages: Array<{ url: string; alt: string; key: string }> = [];

  // Add content images
  if (images?.content || legacyImages.content_image_legacy?.url) {
    availableImages.push({
      url: images?.content || legacyImages.content_image_legacy!.url!,
      alt: legacyImages.content_image_legacy?.alt || 'Article image',
      key: 'content'
    });
  }

  if (images?.content2 || legacyImages.content2_image_legacy?.url) {
    availableImages.push({
      url: images?.content2 || legacyImages.content2_image_legacy!.url!,
      alt: legacyImages.content2_image_legacy?.alt || 'Article image',
      key: 'content2'
    });
  }

  if (images?.content3 || legacyImages.content3_image_legacy?.url) {
    availableImages.push({
      url: images?.content3 || legacyImages.content3_image_legacy!.url!,
      alt: legacyImages.content3_image_legacy?.alt || 'Article image',
      key: 'content3'
    });
  }

  if (images?.content4 || legacyImages.content4_image_legacy?.url) {
    availableImages.push({
      url: images?.content4 || legacyImages.content4_image_legacy!.url!,
      alt: legacyImages.content4_image_legacy?.alt || 'Article image',
      key: 'content4'
    });
  }

  // If no images available, return original HTML
  if (availableImages.length === 0) {
    return html;
  }

  // Find all H2 and H3 positions in the HTML
  const headingRegex = /<h[23][^>]*>/gi;
  const headings: Array<{ index: number; tag: string }> = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({
      index: match.index,
      tag: match[0]
    });
  }

  // If no headings, append all images at the end
  if (headings.length === 0) {
    const imageHtml = availableImages
      .map(img => createImageFigure(img.url, img.alt))
      .join('\n');
    return html + '\n' + imageHtml;
  }

  // Calculate distribution: insert images before strategic headings
  // Distribute images evenly across the article
  const imageCount = availableImages.length;
  const headingCount = headings.length;

  // Calculate which headings should get images
  const headingsWithImages: number[] = [];

  if (imageCount >= headingCount) {
    // More images than headings: put image before each heading and append rest
    for (let i = 0; i < headingCount; i++) {
      headingsWithImages.push(i);
    }
  } else {
    // Fewer images than headings: distribute evenly
    const step = Math.floor(headingCount / imageCount);
    for (let i = 0; i < imageCount; i++) {
      const headingIndex = Math.min(i * step, headingCount - 1);
      headingsWithImages.push(headingIndex);
    }
  }

  // Insert images in reverse order to maintain indices
  let enhancedHtml = html;
  let imageIndex = 0;

  for (let i = headingsWithImages.length - 1; i >= 0; i--) {
    const headingIndex = headingsWithImages[i];
    const heading = headings[headingIndex];
    const image = availableImages[availableImages.length - 1 - i];

    if (image) {
      const imageFigure = createImageFigure(image.url, image.alt);
      enhancedHtml =
        enhancedHtml.slice(0, heading.index) +
        imageFigure + '\n' +
        enhancedHtml.slice(heading.index);
      imageIndex++;
    }
  }

  // Append any remaining images at the end
  if (imageIndex < availableImages.length) {
    const remainingImages = availableImages.slice(imageIndex);
    const imageHtml = remainingImages
      .map(img => createImageFigure(img.url, img.alt))
      .join('\n');
    enhancedHtml += '\n' + imageHtml;
  }

  return enhancedHtml;
}

/**
 * Create HTML figure element for an image
 */
function createImageFigure(url: string, alt: string): string {
  return `
<figure class="my-12">
  <img
    src="${url}"
    alt="${alt}"
    class="w-full h-auto rounded-lg shadow-lg"
  />
</figure>`;
}
