"""Convert embedded pictures to gray; keep PDF fonts, text, links and bookmarks."""
from pathlib import Path
import sys
import pymupdf


def convert(source: Path, target: Path) -> None:
    with pymupdf.open(source) as doc:
        image_xrefs = {image[0] for page in doc for image in page.get_images()}
        for xref in image_xrefs:
            original = pymupdf.Pixmap(doc, xref)
            if original.colorspace is None or original.colorspace.n == 1:
                continue
            gray = pymupdf.Pixmap(pymupdf.csGRAY, original)
            if gray.alpha:
                gray = pymupdf.Pixmap(gray, 0)
            # Keep a separate /SMask unchanged: it contains only opacity.
            doc.xref_set_key(xref, 'ColorSpace', '/DeviceGray')
            doc.xref_set_key(xref, 'BitsPerComponent', '8')
            doc.xref_set_key(xref, 'DecodeParms', 'null')
            doc.xref_set_key(xref, 'Decode', 'null')
            doc.update_stream(xref, gray.samples, compress=True)
        doc.save(target, garbage=3, deflate=True)

    with pymupdf.open(source) as before, pymupdf.open(target) as after:
        assert len(before) == len(after)
        assert before.get_toc() == after.get_toc()
        for i in range(len(before)):
            assert before[i].get_text() == after[i].get_text(), i
            assert len(before[i].get_links()) == len(after[i].get_links()), i
    print(f'Grayscale PDF verified: {target.name}')


if __name__ == '__main__':
    convert(Path(sys.argv[1]), Path(sys.argv[2]))
