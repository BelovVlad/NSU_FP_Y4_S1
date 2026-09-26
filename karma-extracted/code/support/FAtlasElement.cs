using UnityEngine;

public class FAtlasElement
{
	public string name;

	public int indexInAtlas;

	public FAtlas atlas;

	public int atlasIndex;

	public Rect uvRect;

	public Vector2 uvTopLeft;

	public Vector2 uvTopRight;

	public Vector2 uvBottomRight;

	public Vector2 uvBottomLeft;

	public Rect sourceRect;

	public Vector2 sourceSize;

	public Vector2 sourcePixelSize;

	public bool isTrimmed;

	public FAtlasElement Clone()
	{
		return new FAtlasElement
		{
			name = name,
			indexInAtlas = indexInAtlas,
			atlas = atlas,
			atlasIndex = atlasIndex,
			uvRect = uvRect,
			uvTopLeft = uvTopLeft,
			uvTopRight = uvTopRight,
			uvBottomRight = uvBottomRight,
			uvBottomLeft = uvBottomLeft,
			sourceRect = sourceRect,
			sourceSize = sourceSize,
			isTrimmed = isTrimmed
		};
	}
}
