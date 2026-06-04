/**
 * @file aspect-ratio.tsx
 * @description Aspect Ratio UI component. Utility wrapper to constrain visual elements/images to specific proportional dimensions.
 */

"use client";

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
