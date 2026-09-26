using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using UnityEngine;

public class FAtlas
{
	private string _name;

	private string _imagePath;

	private string _dataPath;

	private int _index;

	private List<FAtlasElement> _elements = new List<FAtlasElement>();

	private Dictionary<string, FAtlasElement> _elementsByName = new Dictionary<string, FAtlasElement>();

	private Texture _texture;

	private Vector2 _textureSize;

	private bool _isSingleImage;

	private bool _isTextureAnAsset;

	public List<FAtlasElement> elements => _elements;

	public int index => _index;

	public Texture texture => _texture;

	public Vector2 textureSize => _textureSize;

	public string name => _name;

	public string imagePath => _imagePath;

	public string dataPath => _dataPath;

	public bool isSingleImage => _isSingleImage;

	public FAtlas(string name, Texture texture, int index, bool textureFromAsset)
	{
		_name = name;
		_imagePath = "";
		_dataPath = "";
		_index = index;
		_texture = texture;
		_textureSize = new Vector2(_texture.width, _texture.height);
		_isTextureAnAsset = textureFromAsset;
		CreateAtlasFromSingleImage();
	}

	public FAtlas(string name, string dataPath, Texture texture, int index, bool textureFromAsset)
	{
		_name = name;
		_imagePath = "";
		_dataPath = dataPath;
		_index = index;
		_texture = texture;
		_textureSize = new Vector2(_texture.width, _texture.height);
		_isTextureAnAsset = textureFromAsset;
		_isSingleImage = false;
		LoadAtlasData();
	}

	public FAtlas(string name, string imagePath, string dataPath, int index, bool shouldLoadAsSingleImage)
	{
		_name = name;
		_imagePath = imagePath;
		_dataPath = dataPath;
		_index = index;
		LoadTexture();
		if (shouldLoadAsSingleImage)
		{
			_isSingleImage = true;
			CreateAtlasFromSingleImage();
		}
		else
		{
			_isSingleImage = false;
			LoadAtlasData();
		}
	}

	public FAtlas(string name, string imagePath, string dataPath, int index, bool shouldLoadAsSingleImage, string address)
	{
		_name = name;
		_imagePath = imagePath;
		_dataPath = dataPath;
		_index = index;
		LoadTexture(address);
		if (shouldLoadAsSingleImage)
		{
			_isSingleImage = true;
			CreateAtlasFromSingleImage();
		}
		else
		{
			_isSingleImage = false;
			LoadAtlasData();
		}
	}

	private void LoadTexture(string address = null)
	{
		string text = AssetManager.ResolveFilePath(_imagePath + ".png");
		if (File.Exists(text))
		{
			Texture2D texture2D = new Texture2D(1, 1, TextureFormat.ARGB32, mipChain: false);
			_texture = AssetManager.SafeWWWLoadTexture(ref texture2D, text, clampWrapMode: false, crispPixels: true);
		}
		else
		{
			if (address != null)
			{
				_texture = AGUtils.LoadAddressablesAssetsSync<Texture>(address).First();
			}
			else
			{
				_texture = Resources.Load(_imagePath, typeof(Texture)) as Texture;
			}
			_isTextureAnAsset = true;
		}
		if (_texture == null)
		{
			_isTextureAnAsset = false;
			throw new FutileException("Couldn't load the atlas texture from _imagePath:" + _imagePath + " checkModdedPath:" + text);
		}
		_textureSize = new Vector2(_texture.width, _texture.height);
	}

	private void LoadTexture()
	{
		LoadTexture(null);
	}

	private void LoadAtlasData()
	{
		TextAsset textAsset = null;
		Dictionary<string, object> dictionary = null;
		string path = AssetManager.ResolveFilePath(_dataPath + ".txt");
		if (File.Exists(path))
		{
			dictionary = File.ReadAllText(path).dictionaryFromJson();
		}
		else
		{
			textAsset = Resources.Load(_dataPath, typeof(TextAsset)) as TextAsset;
			if (textAsset == null)
			{
				throw new FutileException("Couldn't load the atlas data from: " + _dataPath);
			}
			dictionary = textAsset.text.dictionaryFromJson();
		}
		if (dictionary == null)
		{
			throw new FutileException("The atlas at " + _dataPath + " was not a proper JSON file. Make sure to select \"Unity3D\" in TexturePacker.");
		}
		Dictionary<string, object> obj = (Dictionary<string, object>)dictionary["frames"];
		float resourceScaleInverse = Futile.resourceScaleInverse;
		int num = 0;
		foreach (KeyValuePair<string, object> item in obj)
		{
			FAtlasElement fAtlasElement = new FAtlasElement();
			fAtlasElement.indexInAtlas = num++;
			string text = item.Key;
			if (Futile.shouldRemoveAtlasElementFileExtensions)
			{
				int num2 = text.LastIndexOf(".");
				if (num2 >= 0)
				{
					text = text.Substring(0, num2);
				}
			}
			fAtlasElement.name = text;
			IDictionary dictionary2 = (IDictionary)item.Value;
			fAtlasElement.isTrimmed = (bool)dictionary2["trimmed"];
			if ((bool)dictionary2["rotated"])
			{
				throw new NotSupportedException("Futile no longer supports TexturePacker's \"rotated\" flag. Please disable it when creating the " + _dataPath + " atlas.");
			}
			IDictionary obj2 = (IDictionary)dictionary2["frame"];
			float num3 = float.Parse(obj2["x"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture);
			float num4 = float.Parse(obj2["y"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture);
			float num5 = float.Parse(obj2["w"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture);
			float num6 = float.Parse(obj2["h"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture);
			Rect rect = (fAtlasElement.uvRect = new Rect(num3 / _textureSize.x, (_textureSize.y - num4 - num6) / _textureSize.y, num5 / _textureSize.x, num6 / _textureSize.y));
			fAtlasElement.uvTopLeft.Set(rect.xMin, rect.yMax);
			fAtlasElement.uvTopRight.Set(rect.xMax, rect.yMax);
			fAtlasElement.uvBottomRight.Set(rect.xMax, rect.yMin);
			fAtlasElement.uvBottomLeft.Set(rect.xMin, rect.yMin);
			IDictionary dictionary3 = (IDictionary)dictionary2["sourceSize"];
			fAtlasElement.sourcePixelSize.x = float.Parse(dictionary3["w"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture);
			fAtlasElement.sourcePixelSize.y = float.Parse(dictionary3["h"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture);
			fAtlasElement.sourceSize.x = fAtlasElement.sourcePixelSize.x * resourceScaleInverse;
			fAtlasElement.sourceSize.y = fAtlasElement.sourcePixelSize.y * resourceScaleInverse;
			IDictionary obj3 = (IDictionary)dictionary2["spriteSourceSize"];
			float x = float.Parse(obj3["x"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture) * resourceScaleInverse;
			float y = float.Parse(obj3["y"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture) * resourceScaleInverse;
			float width = float.Parse(obj3["w"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture) * resourceScaleInverse;
			float height = float.Parse(obj3["h"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture) * resourceScaleInverse;
			fAtlasElement.sourceRect = new Rect(x, y, width, height);
			_elements.Add(fAtlasElement);
			_elementsByName.Add(fAtlasElement.name, fAtlasElement);
		}
		if (textAsset != null)
		{
			Resources.UnloadAsset(textAsset);
		}
	}

	private void CreateAtlasFromSingleImage()
	{
		FAtlasElement fAtlasElement = new FAtlasElement();
		fAtlasElement.name = _name;
		fAtlasElement.indexInAtlas = 0;
		float resourceScaleInverse = Futile.resourceScaleInverse;
		Rect rect = (fAtlasElement.uvRect = new Rect(0f, 0f, 1f, 1f));
		fAtlasElement.uvTopLeft.Set(rect.xMin, rect.yMax);
		fAtlasElement.uvTopRight.Set(rect.xMax, rect.yMax);
		fAtlasElement.uvBottomRight.Set(rect.xMax, rect.yMin);
		fAtlasElement.uvBottomLeft.Set(rect.xMin, rect.yMin);
		fAtlasElement.sourceSize = new Vector2(_textureSize.x * resourceScaleInverse, _textureSize.y * resourceScaleInverse);
		fAtlasElement.sourcePixelSize = new Vector2(_textureSize.x, _textureSize.y);
		fAtlasElement.sourceRect = new Rect(0f, 0f, _textureSize.x * resourceScaleInverse, _textureSize.y * resourceScaleInverse);
		fAtlasElement.isTrimmed = false;
		_elements.Add(fAtlasElement);
		_elementsByName.Add(fAtlasElement.name, fAtlasElement);
	}

	public void UpdateElement(FAtlasElement element, float leftX, float bottomY, float pixelWidth, float pixelHeight)
	{
		element.atlas = this;
		element.atlasIndex = _index;
		float resourceScaleInverse = Futile.resourceScaleInverse;
		Rect rect = (element.uvRect = new Rect(leftX / _textureSize.x, bottomY / _textureSize.y, pixelWidth / _textureSize.x, pixelHeight / _textureSize.y));
		element.uvTopLeft.Set(rect.xMin, rect.yMax);
		element.uvTopRight.Set(rect.xMax, rect.yMax);
		element.uvBottomRight.Set(rect.xMax, rect.yMin);
		element.uvBottomLeft.Set(rect.xMin, rect.yMin);
		element.sourcePixelSize.x = pixelWidth;
		element.sourcePixelSize.y = pixelHeight;
		element.sourceSize.x = element.sourcePixelSize.x * resourceScaleInverse;
		element.sourceSize.y = element.sourcePixelSize.y * resourceScaleInverse;
		element.sourceRect = new Rect(0f, 0f, pixelWidth * resourceScaleInverse, pixelHeight * resourceScaleInverse);
	}

	public FAtlasElement CreateUnnamedElement(float leftX, float bottomY, float pixelWidth, float pixelHeight)
	{
		FAtlasElement fAtlasElement = new FAtlasElement();
		fAtlasElement.atlas = this;
		fAtlasElement.atlasIndex = _index;
		UpdateElement(fAtlasElement, leftX, bottomY, pixelWidth, pixelHeight);
		return fAtlasElement;
	}

	public FAtlasElement CreateNamedElement(string elementName, float leftX, float bottomY, float pixelWidth, float pixelHeight)
	{
		FAtlasElement fAtlasElement = _elementsByName[elementName];
		if (fAtlasElement == null)
		{
			fAtlasElement = new FAtlasElement();
			fAtlasElement.name = elementName;
			fAtlasElement.atlas = this;
			fAtlasElement.atlasIndex = _index;
			_elementsByName.Add(elementName, fAtlasElement);
			_elements.Add(fAtlasElement);
			Futile.atlasManager.AddElement(fAtlasElement);
		}
		UpdateElement(fAtlasElement, leftX, bottomY, pixelWidth, pixelHeight);
		return fAtlasElement;
	}

	public void Unload()
	{
		if (_isTextureAnAsset)
		{
			Resources.UnloadAsset(_texture);
		}
	}

	public bool IsAsset()
	{
		return _isTextureAnAsset;
	}
}
