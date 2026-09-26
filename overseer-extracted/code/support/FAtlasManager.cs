using System.Collections.Generic;
using UnityEngine;

public class FAtlasManager
{
	private static int _nextAtlasIndex;

	private List<FAtlas> _atlases = new List<FAtlas>();

	private Dictionary<string, FAtlasElement> _allElementsByName = new Dictionary<string, FAtlasElement>();

	private List<FFont> _fonts = new List<FFont>();

	private Dictionary<string, FFont> _fontsByName = new Dictionary<string, FFont>();

	public FAtlas GetAtlasWithName(string name)
	{
		int count = _atlases.Count;
		for (int i = 0; i < count; i++)
		{
			if (_atlases[i].name == name)
			{
				return _atlases[i];
			}
		}
		return null;
	}

	public bool DoesContainAtlas(string name)
	{
		int count = _atlases.Count;
		for (int i = 0; i < count; i++)
		{
			if (_atlases[i].name == name)
			{
				return true;
			}
		}
		return false;
	}

	public FAtlas LoadAtlasFromTexture(string name, Texture texture, bool textureFromAsset)
	{
		if (DoesContainAtlas(name))
		{
			return GetAtlasWithName(name);
		}
		FAtlas fAtlas = new FAtlas(name, texture, _nextAtlasIndex++, textureFromAsset);
		AddAtlas(fAtlas);
		return fAtlas;
	}

	public FAtlas LoadAtlasFromTexture(string name, string dataPath, Texture texture, bool textureFromAsset)
	{
		if (DoesContainAtlas(name))
		{
			return GetAtlasWithName(name);
		}
		FAtlas fAtlas = new FAtlas(name, dataPath, texture, _nextAtlasIndex++, textureFromAsset);
		AddAtlas(fAtlas);
		return fAtlas;
	}

	public FAtlas ActuallyLoadAtlasOrImage(string name, string imagePath, string dataPath)
	{
		if (DoesContainAtlas(name))
		{
			return GetAtlasWithName(name);
		}
		bool shouldLoadAsSingleImage = dataPath == "";
		FAtlas fAtlas = new FAtlas(name, imagePath, dataPath, _nextAtlasIndex++, shouldLoadAsSingleImage);
		AddAtlas(fAtlas);
		return fAtlas;
	}

	public FAtlas ActuallyLoadAtlasOrImageFromAddress(string name, string imagePath, string dataPath, string address)
	{
		if (DoesContainAtlas(name))
		{
			return GetAtlasWithName(name);
		}
		bool shouldLoadAsSingleImage = dataPath == "";
		FAtlas fAtlas = new FAtlas(name, imagePath, dataPath, _nextAtlasIndex++, shouldLoadAsSingleImage, address);
		AddAtlas(fAtlas);
		return fAtlas;
	}

	private void AddAtlas(FAtlas atlas)
	{
		int count = atlas.elements.Count;
		for (int i = 0; i < count; i++)
		{
			FAtlasElement fAtlasElement = atlas.elements[i];
			fAtlasElement.atlas = atlas;
			fAtlasElement.atlasIndex = atlas.index;
			if (_allElementsByName.ContainsKey(fAtlasElement.name))
			{
				throw new FutileException("Duplicate element name '" + fAtlasElement.name + "' found! All element names must be unique!");
			}
			_allElementsByName.Add(fAtlasElement.name, fAtlasElement);
		}
		_atlases.Add(atlas);
	}

	public FAtlas LoadAtlas(string atlasPath)
	{
		if (DoesContainAtlas(atlasPath))
		{
			return GetAtlasWithName(atlasPath);
		}
		return ActuallyLoadAtlasOrImage(atlasPath, atlasPath + Futile.resourceSuffix, atlasPath + Futile.resourceSuffix);
	}

	public FAtlas LoadAtlasFromAddress(string atlasPath, string addressablesPath)
	{
		if (DoesContainAtlas(atlasPath))
		{
			return GetAtlasWithName(atlasPath);
		}
		return ActuallyLoadAtlasOrImageFromAddress(atlasPath, atlasPath + Futile.resourceSuffix, atlasPath + Futile.resourceSuffix, addressablesPath);
	}

	public FAtlas LoadImage(string imagePath)
	{
		if (DoesContainAtlas(imagePath))
		{
			return GetAtlasWithName(imagePath);
		}
		return ActuallyLoadAtlasOrImage(imagePath, imagePath + Futile.resourceSuffix, "");
	}

	public void ActuallyUnloadAtlasOrImage(string name)
	{
		for (int num = _atlases.Count - 1; num >= 0; num--)
		{
			FAtlas fAtlas = _atlases[num];
			if (fAtlas.name == name)
			{
				int count = fAtlas.elements.Count;
				for (int i = 0; i < count; i++)
				{
					_allElementsByName.Remove(fAtlas.elements[i].name);
				}
				fAtlas.Unload();
				if (!fAtlas.IsAsset())
				{
					Object.Destroy(fAtlas.texture);
				}
				_atlases.RemoveAt(num);
			}
		}
	}

	public void UnloadAtlas(string atlasPath)
	{
		ActuallyUnloadAtlasOrImage(atlasPath);
	}

	public void UnloadImage(string imagePath)
	{
		ActuallyUnloadAtlasOrImage(imagePath);
	}

	public bool DoesContainElementWithName(string elementName)
	{
		return _allElementsByName.ContainsKey(elementName);
	}

	public FAtlasElement GetElementWithName(string elementName)
	{
		if (_allElementsByName.ContainsKey(elementName))
		{
			return _allElementsByName[elementName];
		}
		string text = null;
		if (elementName.Contains("\\"))
		{
			string[] array = elementName.Split('\\');
			text = array[array.Length - 1];
		}
		else
		{
			string[] array2 = elementName.Split('/');
			text = array2[array2.Length - 1];
		}
		string text2 = null;
		if (text != null)
		{
			text = text.Split('.')[0];
			foreach (KeyValuePair<string, FAtlasElement> item in _allElementsByName)
			{
				if (item.Value.name.Contains(text))
				{
					text2 = item.Value.name;
				}
			}
		}
		if (text2 == null)
		{
			throw new FutileException("Couldn't find element named '" + elementName + "'. \nUse Futile.atlasManager.LogAllElementNames() to see a list of all loaded elements names");
		}
		throw new FutileException("Couldn't find element named '" + elementName + "'. Did you mean '" + text2 + "'? \nUse Futile.atlasManager.LogAllElementNames() to see a list of all loaded element names.");
	}

	public bool DoesContainFontWithName(string fontName)
	{
		return _fontsByName.ContainsKey(fontName);
	}

	public FFont GetFontWithName(string fontName)
	{
		if (DoesContainFontWithName(fontName))
		{
			return _fontsByName[fontName];
		}
		throw new FutileException("Couldn't find font named '" + fontName + "'");
	}

	public void LoadFont(string name, string elementName, string configPath, float offsetX, float offsetY)
	{
		LoadFont(name, elementName, configPath, offsetX, offsetY, new FTextParams(), 1f);
	}

	public void LoadFont(string name, string elementName, string configPath, float offsetX, float offsetY, FTextParams textParams, float fontScale)
	{
		FAtlasElement elementWithName = GetElementWithName(elementName);
		FFont fFont = new FFont(name, elementWithName, configPath, offsetX, offsetY, textParams, fontScale);
		_fonts.Add(fFont);
		_fontsByName.Add(name, fFont);
	}

	public void UnloadFont(string name)
	{
		if (DoesContainFontWithName(name))
		{
			FFont fontWithName = GetFontWithName(name);
			_fonts.Remove(fontWithName);
			_fontsByName.Remove(name);
		}
	}

	public void CombineFonts(string baseFontName, string addFontName, string addElementName, string addConfigPath, float addOffsetY, FTextParams addTextParams, float addFontScale)
	{
		if (DoesContainFontWithName(baseFontName))
		{
			FAtlasElement elementWithName = GetElementWithName(addElementName);
			FFont addFont = new FFont(addFontName, elementWithName, addConfigPath, 0f, 0f, addTextParams, addFontScale);
			_fontsByName[baseFontName].CombineWithFont(addFont, addOffsetY);
			return;
		}
		throw new FutileException("Could not combine fonts when base font [" + baseFontName + "] does not exist!");
	}

	public void AddElement(FAtlasElement element)
	{
		if (_allElementsByName.ContainsKey(element.name))
		{
			throw new FutileException("Duplicate element name '" + element.name + "' found! All element names must be unique!");
		}
		_allElementsByName.Add(element.name, element);
	}

	public void LogAllElementNames()
	{
		foreach (KeyValuePair<string, FAtlasElement> item in _allElementsByName)
		{
			_ = item.Value;
		}
	}
}
