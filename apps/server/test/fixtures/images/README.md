# Test Images

This directory can contain actual image files for testing if needed.

The test suite uses minimal base64-encoded PNG files by default (defined in `test-images.ts`), but you can add real clothing images here for more realistic testing.

## Usage

Place image files here and use `loadTestImageFile()` from `test-images.ts` to load them:

```typescript
const imageBuffer = loadTestImageFile("my-test-shirt.jpg");
```

## Recommended Images

- `tshirt.jpg` - Simple t-shirt
- `jeans.jpg` - Pair of jeans
- `dress.jpg` - Dress or formal wear
- `sneakers.jpg` - Footwear
- `invalid.txt` - Non-image file for error testing
