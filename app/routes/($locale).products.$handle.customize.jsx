// app/routes/($locale).products.$handle.customize.jsx
import {useState} from 'react';
import {useLoaderData} from 'react-router';

/**
 * Loader: fetch the product by handle so we can show it in the customizer
 * @param {{context: any, params: any}} args
 */
export async function loader({context, params}) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle');
  }

  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {
      handle,
    },
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  return {product};
}

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      descriptionHtml
      featuredImage {
        url
        altText
      }
      images(first: 10) {
        nodes {
          id
          url
          altText
          width
          height
        }
      }
      options {
        name
        optionValues {
          name
        }
      }
      variants(first: 50) {
        nodes {
          id
          title
          availableForSale
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
`;

export default function CustomizeProduct() {
  const {product} = useLoaderData();
  console.log('DEBUG customize:', {
    selectedColor,
    selectedSize,
    quantity,
    variants: product.variants?.nodes,
  });


  // ----- derive options from product -----
  const sizeOption =
    product.options?.find(
      (opt) => opt.name && opt.name.toLowerCase() === 'size',
    ) || null;

  const sizeValues = sizeOption
    ? sizeOption.optionValues.map((v) => v.name)
    : [];

  const colorOption =
    product.options?.find(
      (opt) => opt.name && opt.name.toLowerCase() === 'color',
    ) || null;

  const colorValues = colorOption
    ? colorOption.optionValues.map((v) => v.name)
    : [];

  // ----- state for selections -----
  const [selectedSize, setSelectedSize] = useState(
    () => sizeValues[0] || '',
  );
  const [selectedColor, setSelectedColor] = useState(
    () => colorValues[0] || '',
  );
  const [quantity, setQuantity] = useState(1);
  const [artPreview, setArtPreview] = useState(null);

  // ----- helper: find matching variant (more robust) -----
  const matchingVariant = product.variants?.nodes?.find((variant) => {
    const options = variant.selectedOptions || [];

    const requirements = [];

    if (colorOption && selectedColor) {
      requirements.push({
        name: colorOption.name,
        value: selectedColor,
      });
    }

    if (sizeOption && selectedSize) {
      requirements.push({
        name: sizeOption.name,
        value: selectedSize,
      });
    }

    // Every required (name, value) pair must exist in the variant's options (case-insensitive)
    return requirements.every((req) =>
      options.some(
        (opt) =>
          opt.name.toLowerCase() === req.name.toLowerCase() &&
          opt.value.toLowerCase() === req.value.toLowerCase(),
      ),
    );
  });

    // Quick debug: log the first variant's options in the browser console
  if (typeof window !== 'undefined') {
    console.log('First variant options:', product.variants?.nodes?.[0]?.selectedOptions);
  }


  function handleArtUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setArtPreview(url);
  }

  function handleQuantityChange(event) {
    const value = Number(event.target.value || 1);
    if (value < 1) return;
    setQuantity(value);
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">
        Customize: {product.title}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Choose your options, upload your artwork, and preview it on the
        garment.
      </p>

        {/* Debug info about current selection + variant */}
            <section className="mt-2 rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-700 space-y-1">
            <p>
                <strong>Selected:</strong>{' '}
                {selectedColor || 'No color'} / {selectedSize || 'No size'} – Qty:{' '}
                {quantity}
            </p>
            <p>
                <strong>Matching variant:</strong>{' '}
                {matchingVariant
                ? `${matchingVariant.title} (${matchingVariant.id})`
                : 'None found (check options)'}
            </p>
        </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT: mockup / preview */}
        <div className="border rounded-2xl p-4 flex items-center justify-center">
          <div className="relative w-72 h-72 bg-gray-100 flex items-center justify-center">
            {product.featuredImage && (
              <img
                src={product.featuredImage.url}
                alt={product.featuredImage.altText ?? product.title}
                className="max-h-full max-w-full object-contain"
              />
            )}

            {artPreview && (
              <img
                src={artPreview}
                alt="Artwork preview"
                className="absolute max-h-32 max-w-32 object-contain opacity-90"
              />
            )}
          </div>
        </div>

        {/* RIGHT: options & upload */}
        <div className="space-y-6">
          {/* Color section – real clickable buttons */}
          <section>
            <h2 className="font-semibold mb-2">Choose Color</h2>

            {colorValues.length === 0 ? (
              <p className="text-sm text-gray-500">
                No color options for this product.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {colorValues.map((color) => {
                  const isActive = color === selectedColor;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={[
                        'rounded px-3 py-1 text-xs border',
                        isActive
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-800 border-gray-300',
                      ].join(' ')}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Size / quantity – bound to state */}
          <section>
            <h2 className="font-semibold mb-2">Choose Sizes / Quantity</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="w-10 text-sm">Size</label>
                <select
                  className="flex-1 rounded border px-2 py-1 text-sm"
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  disabled={sizeValues.length === 0}
                >
                  {sizeValues.length === 0 && (
                    <option>No sizes</option>
                  )}

                  {sizeValues.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="w-10 text-sm">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="flex-1 rounded border px-2 py-1 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Artwork upload */}
          <section>
            <h2 className="font-semibold mb-2">Upload Artwork</h2>
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,application/pdf"
              className="block w-full text-sm"
              onChange={handleArtUpload}
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported: PNG, JPG, SVG, PDF (max 25MB)
            </p>
          </section>

          {/* Price + CTA (placeholder for now) */}
          <section className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Estimated Price:</span>
              <span className="text-gray-700">$0.00 (placeholder)</span>
            </div>
            <button
              className="w-full mt-2 py-2 rounded-2xl bg-black text-white text-sm font-medium disabled:opacity-50"
              type="button"
              disabled={!matchingVariant}
              // onClick={() => ... next step: add to cart }
            >
              Add Customized Product to Cart (coming soon)
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
