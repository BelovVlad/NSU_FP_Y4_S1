using UnityEngine;

public class CustomFSprite : FSprite
{
	public Vector2[] vertices;

	public Color[] verticeColors;

	public CustomFSprite(string imageName)
	{
		vertices = new Vector2[4];
		for (int i = 0; i < 4; i++)
		{
			vertices[i] = new Vector2(0f, 0f);
		}
		verticeColors = new Color[4];
		for (int j = 0; j < verticeColors.Length; j++)
		{
			verticeColors[j] = _alphaColor;
		}
		Init(FFacetType.Triangle, Futile.atlasManager.GetElementWithName(imageName), 2);
		_isAlphaDirty = true;
		UpdateLocalVertices();
	}

	public void MoveVertice(int ind, Vector2 pos)
	{
		vertices[ind] = pos;
		_isMeshDirty = true;
	}

	public void Refresh()
	{
		_isMeshDirty = true;
	}

	public override void PopulateRenderLayer()
	{
		if (_isOnStage && _firstFacetIndex != -1)
		{
			_isMeshDirty = false;
			int num = _firstFacetIndex * 3;
			Vector3[] array = _renderLayer.vertices;
			Vector2[] uvs = _renderLayer.uvs;
			Vector2[] array2 = new Vector2[4];
			Color[] colors = _renderLayer.colors;
			array2[0] = new Vector2(_element.uvTopLeft.x, _element.uvTopLeft.y);
			array2[1] = new Vector2(_element.uvTopRight.x, _element.uvTopRight.y);
			array2[2] = new Vector2(_element.uvBottomRight.x, _element.uvBottomRight.y);
			array2[3] = new Vector2(_element.uvBottomLeft.x, _element.uvBottomLeft.y);
			for (int i = 0; i < 3; i++)
			{
				colors[num + i] = verticeColors[i];
				colors[num + i + 3] = verticeColors[i + ((i > 0) ? 1 : 0)];
			}
			for (int j = 0; j < 3; j++)
			{
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref array[num + j], vertices[j], 0f);
				uvs[num + j] = array2[j];
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref array[num + 3 + j], vertices[j + ((j > 0) ? 1 : 0)], 0f);
				uvs[num + 3 + j] = array2[j + ((j > 0) ? 1 : 0)];
			}
			_renderLayer.HandleVertsChange();
		}
	}
}
