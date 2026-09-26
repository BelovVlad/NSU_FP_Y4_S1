using RWCustom;
using UnityEngine;

public class TriangleMesh : FSprite
{
	public struct Triangle
	{
		public int a;

		public int b;

		public int c;

		public Triangle(int a, int b, int c)
		{
			this.a = a;
			this.b = b;
			this.c = c;
		}

		public int GetAt(int g)
		{
			return g switch
			{
				2 => c, 
				1 => b, 
				_ => a, 
			};
		}
	}

	public Triangle[] triangles;

	public Vector2[] vertices;

	public Color[] verticeColors;

	public Vector2[] UVvertices;

	public bool customColor;

	public override Color color
	{
		get
		{
			return _color;
		}
		set
		{
			if (customColor)
			{
				for (int i = 0; i < verticeColors.Length; i++)
				{
					verticeColors[i] = value;
				}
			}
			else
			{
				base.color = value;
			}
		}
	}

	public override float alpha
	{
		get
		{
			return base.alpha;
		}
		set
		{
			if (customColor)
			{
				for (int i = 0; i < verticeColors.Length; i++)
				{
					verticeColors[i].a = value;
				}
			}
			else
			{
				base.alpha = value;
			}
		}
	}

	private void SetAtlasedImage(FAtlasElement element)
	{
		Vector2 vector = (element.uvTopLeft + element.uvBottomRight) / 2f;
		for (int i = 0; i < UVvertices.Length; i++)
		{
			UVvertices[i].x = vector.x;
			UVvertices[i].y = vector.y;
		}
	}

	public TriangleMesh(string imageName, Triangle[] tris, bool customColor, bool atlasedImage = false)
	{
		this.customColor = customColor;
		triangles = tris;
		int num = 2;
		for (int i = 0; i < triangles.Length; i++)
		{
			if (triangles[i].a > num)
			{
				num = triangles[i].a;
			}
			if (triangles[i].b > num)
			{
				num = triangles[i].b;
			}
			if (triangles[i].c > num)
			{
				num = triangles[i].c;
			}
		}
		vertices = new Vector2[num + 1];
		UVvertices = new Vector2[num + 1];
		for (int j = 0; j < num; j++)
		{
			vertices[j] = new Vector2(0f, 0f);
			UVvertices[j] = new Vector2(0f, 0f);
		}
		if (customColor)
		{
			verticeColors = new Color[num + 1];
			for (int k = 0; k < verticeColors.Length; k++)
			{
				verticeColors[k] = _alphaColor;
			}
		}
		FAtlasElement elementWithName = Futile.atlasManager.GetElementWithName(imageName);
		Init(FFacetType.Triangle, elementWithName, triangles.Length);
		if (atlasedImage)
		{
			SetAtlasedImage(elementWithName);
		}
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
		if (!_isOnStage || _firstFacetIndex == -1)
		{
			return;
		}
		_isMeshDirty = false;
		int num = _firstFacetIndex * 3;
		Vector3[] array = _renderLayer.vertices;
		Vector2[] uvs = _renderLayer.uvs;
		Color[] colors = _renderLayer.colors;
		if (customColor)
		{
			for (int i = 0; i < triangles.Length; i++)
			{
				for (int j = 0; j < 3; j++)
				{
					colors[num + i * 3 + j] = verticeColors[triangles[i].GetAt(j)];
				}
			}
		}
		else
		{
			for (int k = 0; k < triangles.Length * 3; k++)
			{
				colors[num + k] = _alphaColor;
			}
		}
		int num2 = 0;
		for (int l = 0; l < triangles.Length; l++)
		{
			_concatenatedMatrix.ApplyVector3FromLocalVector2(ref array[num + num2], vertices[triangles[l].a], 0f);
			uvs[num + num2] = UVvertices[triangles[l].a];
			num2++;
			_concatenatedMatrix.ApplyVector3FromLocalVector2(ref array[num + num2], vertices[triangles[l].b], 0f);
			uvs[num + num2] = UVvertices[triangles[l].b];
			num2++;
			_concatenatedMatrix.ApplyVector3FromLocalVector2(ref array[num + num2], vertices[triangles[l].c], 0f);
			uvs[num + num2] = UVvertices[triangles[l].c];
			num2++;
		}
		_renderLayer.HandleVertsChange();
	}

	public static TriangleMesh MakeLongMeshAtlased(int segments, bool pointyTip, bool customColor)
	{
		TriangleMesh triangleMesh = MakeLongMesh(segments, pointyTip, customColor, "RainWorld_White");
		FAtlasElement elementWithName = Futile.atlasManager.GetElementWithName("RainWorld_White");
		triangleMesh.SetAtlasedImage(elementWithName);
		return triangleMesh;
	}

	public static TriangleMesh MakeLongMesh(int segments, bool pointyTip, bool customColor)
	{
		return MakeLongMesh(segments, pointyTip, customColor, "Futile_White");
	}

	public static TriangleMesh MakeLongMesh(int segments, bool pointyTip, bool customColor, string texture)
	{
		Triangle[] array = new Triangle[(segments - 1) * 4 + (pointyTip ? 1 : 2)];
		for (int i = 0; i < segments - 1; i++)
		{
			int num = i * 4;
			for (int j = 0; j < 4; j++)
			{
				array[num + j] = new Triangle(num + j, num + j + 1, num + j + 2);
			}
		}
		array[(segments - 1) * 4] = new Triangle((segments - 1) * 4, (segments - 1) * 4 + 1, (segments - 1) * 4 + 2);
		if (!pointyTip)
		{
			array[(segments - 1) * 4 + 1] = new Triangle((segments - 1) * 4 + 1, (segments - 1) * 4 + 2, (segments - 1) * 4 + 3);
		}
		TriangleMesh triangleMesh = new TriangleMesh(texture, array, customColor);
		float num2 = 1f / (float)((segments - 1) * 2 + 1);
		for (int k = 0; k < triangleMesh.UVvertices.Length; k++)
		{
			triangleMesh.UVvertices[k].x = ((k % 2 == 0) ? 0f : 1f);
			triangleMesh.UVvertices[k].y = (float)(k / 2) * num2;
		}
		if (pointyTip)
		{
			triangleMesh.UVvertices[triangleMesh.UVvertices.Length - 1].x = 0.5f;
		}
		return triangleMesh;
	}

	public static TriangleMesh MakeOneToOneLongMesh(int segments, bool customColor, string texture = "Futile_White")
	{
		TriangleMesh triangleMesh = new TriangleMesh(texture, GridTriangles(segments - 1, 1), customColor);
		for (int i = 0; i < triangleMesh.UVvertices.Length; i += 2)
		{
			float num = (float)i / (float)(triangleMesh.UVvertices.Length - 2);
			triangleMesh.UVvertices[i] = new Vector2(0f, num);
			triangleMesh.UVvertices[i + 1] = new Vector2(1f, num);
		}
		return triangleMesh;
	}

	public static TriangleMesh MakeGridMesh(string texture, int widthHeight)
	{
		Triangle[] array = new Triangle[widthHeight * widthHeight * 2];
		for (int i = 0; i < widthHeight; i++)
		{
			for (int j = 0; j < widthHeight; j++)
			{
				int num = (j + 1) * (widthHeight + 1) + i;
				int a = j * (widthHeight + 1) + i;
				int num2 = j * (widthHeight + 1) + i + 1;
				int c = (j + 1) * (widthHeight + 1) + i + 1;
				array[(j * widthHeight + i) * 2] = new Triangle(a, num2, num);
				array[(j * widthHeight + i) * 2 + 1] = new Triangle(num2, num, c);
			}
		}
		Vector2 uvBottomLeft = Futile.atlasManager.GetElementWithName(texture).uvBottomLeft;
		Vector2 vector = Futile.atlasManager.GetElementWithName(texture).uvTopRight - uvBottomLeft;
		TriangleMesh triangleMesh = new TriangleMesh(texture, array, customColor: true);
		for (int k = 0; k <= widthHeight; k++)
		{
			for (int l = 0; l <= widthHeight; l++)
			{
				int num3 = l * (widthHeight + 1) + k;
				Vector2 vector2 = new Vector2((float)k / (float)widthHeight, (float)l / (float)widthHeight);
				triangleMesh.UVvertices[num3] = uvBottomLeft + new Vector2(vector.x * vector2.x, vector.y * vector2.y);
			}
		}
		return triangleMesh;
	}

	public static void QuadGridMesh(Vector2[] quad, TriangleMesh mesh, int widthHeight)
	{
		for (int i = 0; i <= widthHeight; i++)
		{
			for (int j = 0; j <= widthHeight; j++)
			{
				Vector2 a = Vector2.Lerp(quad[0], quad[1], (float)j / (float)widthHeight);
				Vector2 b = Vector2.Lerp(quad[1], quad[2], (float)i / (float)widthHeight);
				Vector2 b2 = Vector2.Lerp(quad[3], quad[2], (float)j / (float)widthHeight);
				Vector2 a2 = Vector2.Lerp(quad[0], quad[3], (float)i / (float)widthHeight);
				mesh.MoveVertice(j * (widthHeight + 1) + i, Custom.LineIntersection(a, b2, a2, b));
			}
		}
	}

	public static Triangle[] GridTriangles(int nQuadLen, int nQuadWidth)
	{
		Triangle[] array = new Triangle[nQuadLen * nQuadWidth * 2];
		for (int i = 0; i < nQuadLen; i++)
		{
			int num = i * (nQuadWidth + 1);
			int num2 = i * nQuadWidth * 2;
			for (int j = 0; j < nQuadWidth; j++)
			{
				int num3 = num + j;
				int num4 = num2 + j * 2;
				array[num4] = new Triangle(num3, num3 + 1, num3 + 1 + nQuadWidth);
				array[num4 + 1] = new Triangle(num3 + 1 + nQuadWidth, num3 + 1, num3 + 2 + nQuadWidth);
			}
		}
		return array;
	}
}
