using System;
using System.Collections.Generic;
using UnityEngine;

public class FShader
{
	public static FShader defaultShader;

	public static FShader Basic;

	public static FShader Additive;

	public static FShader AdditiveColor;

	public static FShader Solid;

	public static FShader SolidColored;

	private static int _nextShaderIndex = 0;

	private static List<FShader> _shaders = new List<FShader>();

	public int index;

	public string name;

	public Shader shader;

	public string[] keywords;

	private FShader()
	{
		throw new NotSupportedException("Use FShader.CreateShader() instead");
	}

	private FShader(string name, Shader shader, int index)
	{
		this.index = index;
		this.name = name;
		this.shader = shader;
		if (shader == null)
		{
			throw new FutileException("Couldn't find Futile shader '" + name + "'");
		}
	}

	public static void Init()
	{
		Basic = CreateShader("Basic", Shader.Find("Futile/Basic"));
		Additive = CreateShader("Additive", Shader.Find("Futile/Additive"));
		AdditiveColor = CreateShader("AdditiveColor", Shader.Find("Futile/AdditiveColor"));
		Solid = CreateShader("Solid", Shader.Find("Futile/Solid"));
		SolidColored = CreateShader("SolidColored", Shader.Find("Futile/SolidColored"));
		defaultShader = Basic;
	}

	public static FShader CreateShader(string shaderShortName, Shader shader)
	{
		for (int i = 0; i < _shaders.Count; i++)
		{
			if (_shaders[i].name == shaderShortName)
			{
				return _shaders[i];
			}
		}
		FShader fShader = new FShader(shaderShortName, shader, _nextShaderIndex++);
		_shaders.Add(fShader);
		return fShader;
	}

	public static FShader CreateShader(string shaderShortName, Shader shader, string[] keywords)
	{
		FShader fShader = CreateShader(shaderShortName, shader);
		fShader.keywords = keywords;
		return fShader;
	}
}
