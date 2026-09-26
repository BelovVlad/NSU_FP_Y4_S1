using System;
using UnityEngine;

public class FSprite : FFacetElementNode
{
	public static float defaultAnchorX = 0.5f;

	public static float defaultAnchorY = 0.5f;

	protected Color _color = Futile.white;

	protected Color _alphaColor = Futile.white;

	protected Vector2[] _localVertices;

	protected float _anchorX = defaultAnchorX;

	protected float _anchorY = defaultAnchorY;

	protected Rect _localRect;

	protected Rect _textureRect;

	protected bool _isMeshDirty;

	protected bool _areLocalVerticesDirty;

	protected bool _facetTypeQuad = true;

	public virtual Rect textureRect => _textureRect;

	[Obsolete("FSprite's boundsRect is obsolete, use textureRect instead")]
	public Rect boundsRect
	{
		get
		{
			throw new NotSupportedException("boundsRect is obsolete! Use textureRect instead");
		}
	}

	public virtual Rect localRect => _localRect;

	public virtual Color color
	{
		get
		{
			return _color;
		}
		set
		{
			if (_color != value)
			{
				_color = value;
				_isAlphaDirty = true;
			}
		}
	}

	public virtual float width
	{
		get
		{
			return _scaleX * _textureRect.width;
		}
		set
		{
			_scaleX = value / _textureRect.width;
			_isMatrixDirty = true;
		}
	}

	public virtual float height
	{
		get
		{
			return _scaleY * _textureRect.height;
		}
		set
		{
			_scaleY = value / _textureRect.height;
			_isMatrixDirty = true;
		}
	}

	public virtual float anchorX
	{
		get
		{
			return _anchorX;
		}
		set
		{
			if (_anchorX != value)
			{
				_anchorX = value;
				_areLocalVerticesDirty = true;
			}
		}
	}

	public virtual float anchorY
	{
		get
		{
			return _anchorY;
		}
		set
		{
			if (_anchorY != value)
			{
				_anchorY = value;
				_areLocalVerticesDirty = true;
			}
		}
	}

	protected FSprite()
	{
		_localVertices = new Vector2[4];
	}

	public FSprite(string elementName, bool quadType = true)
		: this(Futile.atlasManager.GetElementWithName(elementName), quadType)
	{
	}

	public FSprite(FAtlasElement element, bool quadType = true)
	{
		_facetTypeQuad = quadType;
		_localVertices = new Vector2[4];
		if (_facetTypeQuad)
		{
			Init(FFacetType.Quad, element, 1);
		}
		else
		{
			Init(FFacetType.Triangle, element, 2);
		}
		_isAlphaDirty = true;
		UpdateLocalVertices();
	}

	public override void HandleElementChanged()
	{
		_areLocalVerticesDirty = true;
		UpdateLocalVertices();
	}

	public override void Redraw(bool shouldForceDirty, bool shouldUpdateDepth)
	{
		bool num = _isMatrixDirty;
		bool isAlphaDirty = _isAlphaDirty;
		UpdateDepthMatrixAlpha(shouldForceDirty, shouldUpdateDepth);
		if (shouldUpdateDepth)
		{
			UpdateFacets();
		}
		if (num || shouldForceDirty || shouldUpdateDepth)
		{
			_isMeshDirty = true;
		}
		if (isAlphaDirty || shouldForceDirty)
		{
			_isMeshDirty = true;
			_color.ApplyMultipliedAlpha(ref _alphaColor, _concatenatedAlpha);
		}
		if (_areLocalVerticesDirty)
		{
			UpdateLocalVertices();
		}
		if (_isMeshDirty)
		{
			PopulateRenderLayer();
		}
	}

	public virtual void UpdateLocalVertices()
	{
		_areLocalVerticesDirty = false;
		_textureRect.width = _element.sourceSize.x;
		_textureRect.height = _element.sourceSize.y;
		_textureRect.x = (0f - _anchorX) * _textureRect.width;
		_textureRect.y = (0f - _anchorY) * _textureRect.height;
		float num = _element.sourceRect.width;
		float num2 = _element.sourceRect.height;
		float num3 = _textureRect.x + _element.sourceRect.x;
		float num4 = _textureRect.y + (_textureRect.height - _element.sourceRect.y - _element.sourceRect.height);
		_localRect.x = num3;
		_localRect.y = num4;
		_localRect.width = num;
		_localRect.height = num2;
		_localVertices[0].Set(num3, num4 + num2);
		_localVertices[1].Set(num3 + num, num4 + num2);
		_localVertices[2].Set(num3 + num, num4);
		_localVertices[3].Set(num3, num4);
		_isMeshDirty = true;
	}

	public override void PopulateRenderLayer()
	{
		if (_isOnStage && _firstFacetIndex != -1)
		{
			_isMeshDirty = false;
			Vector3[] vertices = _renderLayer.vertices;
			Vector2[] uvs = _renderLayer.uvs;
			Color[] colors = _renderLayer.colors;
			if (_facetTypeQuad)
			{
				int num = _firstFacetIndex * 4;
				int num2 = num + 1;
				int num3 = num + 2;
				int num4 = num + 3;
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num], _localVertices[0], _meshZ);
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num2], _localVertices[1], _meshZ);
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num3], _localVertices[2], _meshZ);
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num4], _localVertices[3], _meshZ);
				uvs[num] = _element.uvTopLeft;
				uvs[num2] = _element.uvTopRight;
				uvs[num3] = _element.uvBottomRight;
				uvs[num4] = _element.uvBottomLeft;
				colors[num] = _alphaColor;
				colors[num2] = _alphaColor;
				colors[num3] = _alphaColor;
				colors[num4] = _alphaColor;
			}
			else
			{
				int num5 = _firstFacetIndex * 3;
				int num6 = num5 + 1;
				int num7 = num5 + 2;
				int num8 = num5 + 3;
				int num9 = num5 + 4;
				int num10 = num5 + 5;
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num5], _localVertices[0], _meshZ);
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num6], _localVertices[1], _meshZ);
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num7], _localVertices[2], _meshZ);
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num8], _localVertices[0], _meshZ);
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num9], _localVertices[2], _meshZ);
				_concatenatedMatrix.ApplyVector3FromLocalVector2(ref vertices[num10], _localVertices[3], _meshZ);
				uvs[num5] = _element.uvTopLeft;
				uvs[num6] = _element.uvTopRight;
				uvs[num7] = _element.uvBottomRight;
				uvs[num8] = _element.uvTopLeft;
				uvs[num9] = _element.uvBottomRight;
				uvs[num10] = _element.uvBottomLeft;
				colors[num5] = _alphaColor;
				colors[num6] = _alphaColor;
				colors[num7] = _alphaColor;
				colors[num8] = _alphaColor;
				colors[num9] = _alphaColor;
				colors[num10] = _alphaColor;
			}
			_renderLayer.HandleVertsChange();
		}
	}

	public Rect GetTextureRectRelativeToContainer()
	{
		return _textureRect.CloneAndScaleThenOffset(_scaleX, _scaleY, _x, _y);
	}

	public void SetAnchor(float newX, float newY)
	{
		anchorX = newX;
		anchorY = newY;
	}

	public void SetAnchor(Vector2 newAnchor)
	{
		anchorX = newAnchor.x;
		anchorY = newAnchor.y;
	}

	public Vector2 GetAnchor()
	{
		return new Vector2(_anchorX, _anchorY);
	}
}
