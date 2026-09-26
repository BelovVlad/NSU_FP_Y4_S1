using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using Unity.Mathematics;
using UnityEngine;

namespace RWCustom;

public static class Custom
{
	public const string NewLine = "\r\n";

	public static RainWorld rainWorld = null;

	public static IntVector2[] eightDirections = new IntVector2[8]
	{
		new IntVector2(-1, 0),
		new IntVector2(-1, -1),
		new IntVector2(0, -1),
		new IntVector2(1, -1),
		new IntVector2(1, 0),
		new IntVector2(1, 1),
		new IntVector2(0, 1),
		new IntVector2(-1, 1)
	};

	public static IntVector2[] eightDirectionsDiagonalsLast = new IntVector2[8]
	{
		new IntVector2(-1, 0),
		new IntVector2(0, -1),
		new IntVector2(1, 0),
		new IntVector2(0, 1),
		new IntVector2(-1, -1),
		new IntVector2(1, -1),
		new IntVector2(1, 1),
		new IntVector2(-1, 1)
	};

	public static IntVector2[] zeroAndEightDirectionsDiagonalsLast = new IntVector2[9]
	{
		new IntVector2(0, 0),
		new IntVector2(-1, 0),
		new IntVector2(0, -1),
		new IntVector2(1, 0),
		new IntVector2(0, 1),
		new IntVector2(-1, -1),
		new IntVector2(1, -1),
		new IntVector2(1, 1),
		new IntVector2(-1, 1)
	};

	public static IntVector2[] eightDirectionsAndZero = new IntVector2[9]
	{
		new IntVector2(0, 0),
		new IntVector2(-1, 0),
		new IntVector2(-1, -1),
		new IntVector2(0, -1),
		new IntVector2(1, -1),
		new IntVector2(1, 0),
		new IntVector2(1, 1),
		new IntVector2(0, 1),
		new IntVector2(-1, 1)
	};

	public static IntVector2[] fourDirections = new IntVector2[4]
	{
		new IntVector2(-1, 0),
		new IntVector2(0, -1),
		new IntVector2(1, 0),
		new IntVector2(0, 1)
	};

	public static int2[] fourDirectionsInt2 = new int2[4]
	{
		new int2(-1, 0),
		new int2(0, -1),
		new int2(1, 0),
		new int2(0, 1)
	};

	public static IntVector2[] fourDirectionsAndZero = new IntVector2[5]
	{
		new IntVector2(0, 0),
		new IntVector2(-1, 0),
		new IntVector2(0, -1),
		new IntVector2(1, 0),
		new IntVector2(0, 1)
	};

	public static IntVector2[] diagonals = new IntVector2[4]
	{
		new IntVector2(-1, -1),
		new IntVector2(-1, 1),
		new IntVector2(1, 1),
		new IntVector2(1, -1)
	};

	public static IntVector2[] leftRightUpDown = new IntVector2[4]
	{
		new IntVector2(-1, 0),
		new IntVector2(1, 0),
		new IntVector2(0, 1),
		new IntVector2(0, -1)
	};

	public static Color[] FadableVectorCircleColors = new Color[8]
	{
		new Color(1f, 1f, 1f),
		new Color(1f, 0f, 0f),
		new Color(0f, 1f, 0f),
		new Color(0f, 0f, 1f),
		RainWorld.GoldRGB,
		new Color(0f, 0f, 0f),
		new Color(1f, 0.7f, 0.35f),
		RainWorld.RippleColor
	};

	private static readonly AGLog<RainWorld> Logger = new AGLog<RainWorld>();

	private static string rootFolderDirectory;

	private static string encrptString = "IA/AF57P16dUz+wU1A/9K00Py47ND+8VBk/GRwEPxPE4D78LMM+WLCkPpQTjT5dJWY+Nhg+PuYNEz6WVOo9DpOoPZ11fT3DuTU9WigSP9yeKT8U+EQ/EghqPxKqbj8AAIA/pihwPzuncT9L2XI/In50PzpJdj9D4nY/CVV3P8/Hdz+VOng/tp56PwAAgD90eHo/ZEZ5P53TeD+57FA/wxcxPyjWFz90awE/6cbdPj6xvj7LUrY+KNaXPnRrgT4kbk8+BvonPgBRAj65qMc91tuRPW7PVD2aeCk/0tFEP9DhaT8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPxmHeD81oFA/P8swP6SJFz/vHgE/ZXrdPtG30j5HBrY+rCKYPu8egT4sB1A+/WAnPgjqAj6pdsY95g2TPZxOEj9YUik/Vh5FP467aT91kmw/AACAP2QCcD/5gHE/CbNyP+BXdD/4InY/Abx2P8cudz+NoXc/UxR4P9dgeD/f+Xg/pmx5PyEgeT9brXg/d8ZQP4HxMD/mrxc/MUUBP/Ar+j7okvk+3/n4PlUE0z7DubU+MG+YPmvSgD41oFA+9ccmPhCDAz6YRMU9xNMnP7oGQz8zymc/AACAPwAAgD8AAIA/AACAPzsFbT9vi0s/f71MP5iITj+gIU8/ZpRPP+rgTz9uLVA/+xJRP/CJdT9/X1E/PTlRP/N5UD8FPjE/YmMXPzhmFD+sgBM/pOcSP950Ej8H0BA/W634PtpQ0z4/bbU+tLuYPueFgD49OVE+7S4mPhkcBD6DgxA/gq0nP/wsQz/xo2c/VC5qPwAAgD99K20/+85HPxbOLT8eZy4/s+UvP3lYMD+pGEs/Q0ByP88lcz+uY3U/AACAP2w9dT+HVk0/R2QxP8wOLT9Hwiw/BZwsP3m2Kz/t0Co/ohEqPxYsKT9J9hA/12D4Pl6d0z67ILU+OAiZPmM5gD5F0lE+5ZUlPvXHJj9fFUE/wA1kPwAAgD8AAIA/AACAP/k8aD+AeUM/ToVEPx2RRT9nUEY/Z/JKPwEacj8AAIA/AACAPwAAgD8AAIA/AACAP9i+cz93JEw/kE1JPwwBST+ItEg/d4JHP+MDRj+YREU/BMZDP9QFKT8PaRE/UxT4PuLp0z421LQ+vFSZPr7Zfz5Na1I+OcQPP7OhJj+hO0E/fudjP699Zz8AAIA/bVdnP7cWaD+GImk/2HpqP+msaz8tw0Y/6z5LP7/zcT+N/3I/U3JzPwAAgD8a5XM/KnVwPyLcbz8aQ28/0INuP0s3bj/53mw/bflrP1zHaj9MlWk/DF9EPw6TKD8YAhI/S3v3PvIb1T4uO7Q+zYaaPq6nfj5p4iU/TuM/P6/bYj8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAP2Rgaz8Umkk/lvZuPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8";

	private static string EncryptionString => encrptString.Substring(54, 1447);

	private static string CheckSumSalt => encrptString.Substring(64, 97);

	public static T ParseEnum<T>(string value)
	{
		return (T)Enum.Parse(typeof(T), value, ignoreCase: true);
	}

	public static bool IsDigitString(string str)
	{
		if (str != "")
		{
			return str.All(char.IsDigit);
		}
		return false;
	}

	public static string ReplaceLineDelimeters(string s)
	{
		return s.Replace("<LINE>", "\r\n").Replace("<WWLINE>", "");
	}

	public static string ReplaceWordWrapLineDelimeters(string s)
	{
		bool num = s.Contains("<WWLINE>");
		string text = s.Replace("<WWLINE>", "\r\n");
		if (!num)
		{
			return text.Replace("<LINE>", "\r\n");
		}
		return text.Replace("<LINE>", "");
	}

	public static string TruncateString(string s, int maxLength)
	{
		if (s.Length < maxLength)
		{
			return s;
		}
		return s.Substring(0, maxLength - 3) + "...";
	}

	public static void Log(params string[] values)
	{
	}

	public static void LogImportant(params string[] values)
	{
		if (RainWorld.ShowLogs)
		{
			UnityEngine.Debug.Log(string.Join(" ", values));
		}
	}

	public static void LogWarning(params string[] values)
	{
		if (RainWorld.ShowLogs)
		{
			UnityEngine.Debug.LogWarning(string.Join(" ", values));
		}
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float Dist(Vector2 p1, Vector2 p2)
	{
		return Mathf.Sqrt(Mathf.Abs(p1.x - p2.x) * Mathf.Abs(p1.x - p2.x) + Mathf.Abs(p1.y - p2.y) * Mathf.Abs(p1.y - p2.y));
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float DistNoSqrt(Vector2 p1, Vector2 p2)
	{
		return Mathf.Abs(p1.x - p2.x) * Mathf.Abs(p1.x - p2.x) + Mathf.Abs(p1.y - p2.y) * Mathf.Abs(p1.y - p2.y);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static bool DistLess(Vector2 p1, Vector2 p2, float dst)
	{
		return (p1 - p2).magnitude < dst;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static bool DistLess(IntVector2 p1, IntVector2 p2, float dst)
	{
		return DistLess(p1.ToVector2(), p2.ToVector2(), dst);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static bool DistLess(WorldCoordinate a, WorldCoordinate b, float dst)
	{
		if (a.room == b.room)
		{
			return DistLess(a.Tile.ToVector2(), b.Tile.ToVector2(), dst);
		}
		return false;
	}

	public static bool VectorIsCloser(Vector2 A, Vector2 B, Vector2 comparePoint)
	{
		return Mathf.Abs(A.x - comparePoint.x) * Mathf.Abs(A.x - comparePoint.x) + Mathf.Abs(A.y - comparePoint.y) * Mathf.Abs(A.y - comparePoint.y) < Mathf.Abs(B.x - comparePoint.x) * Mathf.Abs(B.x - comparePoint.x) + Mathf.Abs(B.y - comparePoint.y) * Mathf.Abs(B.y - comparePoint.y);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 DirVec(Vector2 p1, Vector2 p2)
	{
		if (p1 == p2)
		{
			return new Vector2(0f, 1f);
		}
		return new Vector2(p2[0] - p1[0], p2[1] - p1[1]).normalized;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 DirVec(float2 p1, Vector2 p2)
	{
		if (p1.Equals(p2))
		{
			return new Vector2(0f, 1f);
		}
		return new Vector2(p2[0] - p1[0], p2[1] - p1[1]).normalized;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 DirVec(Vector2 p1, float2 p2)
	{
		if (p1.Equals(p2))
		{
			return new Vector2(0f, 1f);
		}
		return new Vector2(p2[0] - p1[0], p2[1] - p1[1]).normalized;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float2 DirVec(float2 p1, float2 p2)
	{
		if (p1.Equals(p2))
		{
			return new float2(0f, 1f);
		}
		return new float2(p2[0] - p1[0], p2[1] - p1[1]).normalized();
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float MapRange(float n, float oldMin, float oldMax, float newMin, float newMax)
	{
		return newMin + (n - oldMin) * (newMax - newMin) / (oldMax - oldMin);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float MapRangeClamped(float n, float oldMin, float oldMax, float newMin, float newMax)
	{
		return Mathf.Clamp(newMin + (n - oldMin) * (newMax - newMin) / (oldMax - oldMin), newMin, newMax);
	}

	public static int Factorial(int n)
	{
		if (n <= 1)
		{
			return 1;
		}
		return n * Factorial(n - 1);
	}

	public static float CirclesCollisionTime(float x1, float y1, float x2, float y2, float vx1, float vy1, float r1, float r2)
	{
		float num = 0.001f;
		float num2 = 0.001f;
		float num3 = (0f - x1) * vx1 - y1 * vy1 + vx1 * x2 + vy1 * y2 + x1 * num - x2 * num + y1 * num2 - y2 * num2;
		float num4 = (0f - x1) * vx1 - y1 * vy1 + vx1 * x2 + vy1 * y2 + x1 * num - x2 * num + y1 * num2 - y2 * num2;
		float num5 = Mathf.Pow(vx1, 2f) + Mathf.Pow(vy1, 2f) - 2f * vx1 * num + Mathf.Pow(num, 2f) - 2f * vy1 * num2 + Mathf.Pow(num2, 2f);
		float num6 = Mathf.Pow(x1, 2f) + Mathf.Pow(y1, 2f) - Mathf.Pow(r1, 2f) - 2f * x1 * x2 + Mathf.Pow(x2, 2f) - 2f * y1 * y2 + Mathf.Pow(y2, 2f) - 2f * r1 * r2 - Mathf.Pow(r2, 2f);
		float num7 = Mathf.Pow(vx1, 2f) + Mathf.Pow(vy1, 2f) - 2f * vx1 * num + Mathf.Pow(num, 2f) - 2f * vy1 * num2 + Mathf.Pow(num2, 2f);
		return (2f * num3 - Mathf.Sqrt(Mathf.Pow(-2f * num4, 2f) - 4f * num5 * num6)) / (2f * num7);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 DegToVec(float ang)
	{
		return new Vector2(Mathf.Sin(ang * ((float)Math.PI / 180f)), Mathf.Cos(ang * ((float)Math.PI / 180f)));
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float2 DegToFloat2(float ang)
	{
		float x = math.radians(ang);
		return new float2(math.sin(x), math.cos(x));
	}

	public static Vector2 IntVector2ToVector2(IntVector2 ivect2)
	{
		return new Vector2(ivect2.x, ivect2.y);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float AimFromOneVectorToAnother(Vector2 p1, Vector2 p2)
	{
		return VecToDeg(p2 - p1);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float VecToDeg(Vector2 v)
	{
		return Mathf.Atan2(v.x, v.y) / ((float)Math.PI * 2f) * 360f;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float Float2ToDeg(float2 v)
	{
		return math.atan2(v.x, v.y) / ((float)Math.PI * 2f) * 360f;
	}

	public static float Angle(Vector2 A, Vector2 B)
	{
		return Vector2.Angle(A, B) * Mathf.Sign(DistanceToLine(A, B, -B));
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 PerpendicularVector(Vector2 v)
	{
		v.Normalize();
		return new Vector2(0f - v.y, v.x);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float2 PerpendicularVector(float2 v)
	{
		v = v.normalized();
		return new float2(0f - v.y, v.x);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 PerpendicularVector(Vector2 v1, Vector2 v2)
	{
		return PerpendicularVector(v1 - v2);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float2 PerpendicularVector(float2 v1, float2 v2)
	{
		return PerpendicularVector(v1 - v2);
	}

	public static Vector2 RotateAroundVector(Vector2 vec, Vector2 pivot, float degAng)
	{
		vec -= pivot;
		vec = RotateAroundOrigo(vec, degAng);
		return vec + pivot;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 RotateAroundOrigo(Vector2 vec, float degAng)
	{
		degAng *= -(float)Math.PI / 180f;
		float num = Mathf.Cos(degAng);
		float num2 = Mathf.Sin(degAng);
		return new Vector2(num * vec.x - num2 * vec.y, num2 * vec.x + num * vec.y);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float2 RotateAroundOrigo(float2 vec, float degAng)
	{
		degAng *= -(float)Math.PI / 180f;
		float num = math.cos(degAng);
		float num2 = math.sin(degAng);
		return new float2(num * vec.x - num2 * vec.y, num2 * vec.x + num * vec.y);
	}

	public static Vector2 FlattenVectorAlongAxis(Vector2 vec, float axis, float fac)
	{
		vec = RotateAroundOrigo(vec, axis);
		vec.y *= fac;
		return RotateAroundOrigo(vec, 0f - axis);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float LerpAndTick(float from, float to, float lerp, float tick)
	{
		float num = Mathf.Lerp(from, to, lerp);
		if (num < to)
		{
			return Math.Min(num + tick, to);
		}
		return Math.Max(num - tick, to);
	}

	public static void InitializeRootFolderDirectory()
	{
		rootFolderDirectory = Application.streamingAssetsPath;
	}

	public static string RootFolderDirectory()
	{
		return rootFolderDirectory;
	}

	public static string LegacyRootFolderDirectory()
	{
		string[] array = Assembly.GetExecutingAssembly().Location.Split(Path.DirectorySeparatorChar);
		string text = "";
		for (int i = 0; i < array.Length - 3; i++)
		{
			text = text + array[i] + Path.DirectorySeparatorChar;
		}
		return text;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static int IntClamp(int val, int inclMin, int inclMax)
	{
		if (val < inclMin)
		{
			return inclMin;
		}
		if (val > inclMax)
		{
			return inclMax;
		}
		return val;
	}

	public static Color Multiply(Color A, Color B)
	{
		return new Color(A.r * B.r, A.g * B.g, A.b * B.b);
	}

	public static Color Screen(Color A, Color B)
	{
		return new Color(1f - (1f - A.r) * (1f - B.r), 1f - (1f - A.g) * (1f - B.g), 1f - (1f - A.b) * (1f - B.b));
	}

	public static Vector2 ApplyDepthOnVector(Vector2 v, Vector2 depthPoint, float d)
	{
		d *= -0.025f;
		v -= depthPoint;
		d = (10f - d) * 0.1f;
		v /= d;
		v += depthPoint;
		return v;
	}

	public static Rect ApplyDepthOnRect(Rect rect, Vector2 depthPoint, float d)
	{
		Vector2 v = new Vector2(rect.xMin, rect.yMin);
		Vector2 v2 = new Vector2(rect.xMax, rect.yMax);
		v = ApplyDepthOnVector(v, depthPoint, d);
		v2 = ApplyDepthOnVector(v2, depthPoint, d);
		return new Rect(v, v2 - v);
	}

	public static float GetDepthScale(float d)
	{
		return 10f / (10f + d * 0.75f);
	}

	public static float Decimal(float f)
	{
		return f - Mathf.Floor(f);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 Bezier(Vector2 A, Vector2 cA, Vector2 B, Vector2 cB, float f)
	{
		Vector2 vector = Vector2.Lerp(cA, cB, f);
		cA = Vector2.Lerp(A, cA, f);
		cB = Vector2.Lerp(cB, B, f);
		cA = Vector2.Lerp(cA, vector, f);
		cB = Vector2.Lerp(vector, cB, f);
		return Vector2.Lerp(cA, cB, f);
	}

	public static Vector2 BezierDerivative(Vector2 A, Vector2 cA, Vector2 B, Vector2 cB, float f)
	{
		return 3f * (1f - f) * (1f - f) * (cA - A) + 6f * (1f - f) * f * (cB - cA) + 3f * f * f * (B - cB);
	}

	public static float BezierLength(Vector2 A, Vector2 cA, Vector2 B, Vector2 cB, int segments)
	{
		float num = 0f;
		Vector2 a = Vector2.zero;
		for (int i = 0; i < segments; i++)
		{
			float f = (float)(i + 1) / (float)segments;
			Vector2 vector = Bezier(A, cA, B, cB, f);
			num += Vector2.Distance(a, vector);
			a = vector;
		}
		return num;
	}

	public static float BezierLengthRecursive(Vector2 A, Vector2 cA, Vector2 B, Vector2 cB, float error = 0.1f, int increment = 5, int initialSegments = 10)
	{
		int num = initialSegments;
		float num2 = 0f;
		for (int i = 0; i < 1000; i++)
		{
			float num3 = BezierLength(A, cA, B, cB, num);
			num += increment;
			if (num3 - error < num2)
			{
				return num2;
			}
			num2 = num3;
		}
		LogWarning("BezierLengthRecursive looped over 1000 times! emergency return");
		return num2;
	}

	public static void BezierSplit(BezierCurve input, float f, out BezierCurve out1, out BezierCurve out2)
	{
		float t = Mathf.Clamp(f, 0f, 1f);
		Vector2 vector = Vector2.Lerp(input.posA, input.handleA, t);
		Vector2 vector2 = Vector2.Lerp(input.handleA, input.handleB, t);
		Vector2 vector3 = Vector2.Lerp(input.handleB, input.posB, t);
		Vector2 vector4 = Vector2.Lerp(vector, vector2, t);
		Vector2 vector5 = Vector2.Lerp(vector2, vector3, t);
		Vector2 vector6 = Vector2.Lerp(vector4, vector5, t);
		out1 = new BezierCurve(input.posA, vector, vector6, vector4);
		out2 = new BezierCurve(vector6, vector5, input.posB, vector3);
	}

	public static float BezierYatX(BezierCurve bezier, float x)
	{
		float num = 0f;
		float num2 = 1f;
		for (int i = 0; i < 16; i++)
		{
			float num3 = (num + num2) / 2f;
			if (bezier.GetPoint(num3).x < x)
			{
				num = num3;
			}
			else
			{
				num2 = num3;
			}
		}
		return bezier.GetPoint((num + num2) / 2f).y;
	}

	public static float BezierXatY(BezierCurve bezier, float y)
	{
		float num = 0f;
		float num2 = 1f;
		for (int i = 0; i < 16; i++)
		{
			float num3 = (num + num2) / 2f;
			if (bezier.GetPoint(num3).y < y)
			{
				num = num3;
			}
			else
			{
				num2 = num3;
			}
		}
		return bezier.GetPoint((num + num2) / 2f).x;
	}

	public static BezierCurve BezierRelativeToAbsolute(BezierCurve relative)
	{
		return new BezierCurve(relative.posA, relative.handleA + relative.posA, relative.posB + relative.posA, relative.handleB + relative.posB + relative.posA);
	}

	public static BezierCurve BezierAbsoluteToRelative(BezierCurve absolute)
	{
		return new BezierCurve(absolute.posA, absolute.handleA - absolute.posA, absolute.posB - absolute.posA, absolute.handleB - absolute.posB);
	}

	public static void BezierThroughHandles(Vector2 A, ref Vector2 cA, Vector2 B, ref Vector2 cB)
	{
		float num = Vector2.Distance(A, cA);
		float num2 = Vector2.Distance(cA, cB);
		float num3 = Vector2.Distance(B, cB);
		float num4 = num / (num + num2 + num3);
		float num5 = (num + num2) / (num + num2 + num3);
		float num6 = num4 * (1f - num4) * (1f - num4) * 3f;
		float num7 = (1f - num4) * num4 * num4 * 3f;
		float num8 = num5 * (1f - num5) * (1f - num5) * 3f;
		float num9 = (1f - num5) * num5 * num5 * 3f;
		float num10 = cA.x - A.x * Mathf.Pow(1f - num4, 3f) - B.x * Mathf.Pow(num4, 3f);
		float num11 = cB.x - A.x * Mathf.Pow(1f - num5, 3f) - B.x * Mathf.Pow(num5, 3f);
		float num12 = cA.y - A.y * Mathf.Pow(1f - num4, 3f) - B.y * Mathf.Pow(num4, 3f);
		float num13 = cB.y - A.y * Mathf.Pow(1f - num5, 3f) - B.y * Mathf.Pow(num5, 3f);
		cB.x = (num10 - num6 / num8 * num11) / (num7 - num6 * num9 / num8);
		cA.x = (num10 - num7 * cB.x) / num6;
		cB.y = (num12 - num6 / num8 * num13) / (num7 - num6 * num9 / num8);
		cA.y = (num12 - num7 * cB.y) / num6;
	}

	public static IntVector2 RestrictInRect(IntVector2 vec, IntRect rect)
	{
		return new IntVector2(IntClamp(vec.x, rect.left, rect.right), IntClamp(vec.y, rect.bottom, rect.top));
	}

	public static Vector2 RestrictInRect(Vector2 vec, FloatRect rect)
	{
		return new Vector2(Mathf.Clamp(vec.x, rect.left, rect.right), Mathf.Clamp(vec.y, rect.bottom, rect.top));
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 MoveTowards(Vector2 A, Vector2 B, float speed)
	{
		if (DistLess(A, B, speed))
		{
			return B;
		}
		return A + DirVec(A, B) * speed;
	}

	public static bool IntVectorsOpposite(IntVector2 a, IntVector2 b)
	{
		if (a.x == -b.x)
		{
			return a.y == -b.y;
		}
		return false;
	}

	public static bool InsideRect(IntVector2 vec, IntRect rect)
	{
		if (vec.x >= rect.left && vec.x <= rect.right && vec.y >= rect.bottom)
		{
			return vec.y <= rect.top;
		}
		return false;
	}

	public static float VectorRectDistance(Vector2 vec, FloatRect rect)
	{
		return Vector2.Distance(vec, RestrictInRect(vec, rect));
	}

	public static bool InsideRect(int x, int y, IntRect rect)
	{
		if (x >= rect.left && x <= rect.right && y >= rect.bottom)
		{
			return y <= rect.top;
		}
		return false;
	}

	public static bool InRange(float f, float xA, float xB)
	{
		if (xA < xB)
		{
			if (f >= xA)
			{
				return f <= xB;
			}
			return false;
		}
		if (f >= xB)
		{
			return f <= xA;
		}
		return false;
	}

	public static IntVector2 RectZone(Vector2 pos, FloatRect rect)
	{
		IntVector2 result = new IntVector2(0, 0);
		if (pos.x < rect.left)
		{
			result.x = -1;
		}
		else if (pos.x > rect.right)
		{
			result.x = 1;
		}
		if (pos.y < rect.bottom)
		{
			result.y = -1;
		}
		else if (pos.y > rect.top)
		{
			result.y = 1;
		}
		return result;
	}

	public static FloatRect.CornerLabel[] VisibleCornersOnRect(Vector2 viewPos, FloatRect rect)
	{
		FloatRect.CornerLabel cornerLabel = FloatRect.CornerLabel.None;
		FloatRect.CornerLabel cornerLabel2 = FloatRect.CornerLabel.None;
		switch (RectZone(viewPos, rect).x)
		{
		case -1:
			switch (RectZone(viewPos, rect).y)
			{
			case -1:
				cornerLabel = FloatRect.CornerLabel.A;
				cornerLabel2 = FloatRect.CornerLabel.C;
				break;
			case 0:
				cornerLabel = FloatRect.CornerLabel.A;
				cornerLabel2 = FloatRect.CornerLabel.D;
				break;
			case 1:
				cornerLabel = FloatRect.CornerLabel.B;
				cornerLabel2 = FloatRect.CornerLabel.D;
				break;
			}
			break;
		case 0:
			switch (RectZone(viewPos, rect).y)
			{
			case -1:
				cornerLabel = FloatRect.CornerLabel.D;
				cornerLabel2 = FloatRect.CornerLabel.C;
				break;
			case 0:
				cornerLabel = FloatRect.CornerLabel.None;
				cornerLabel2 = FloatRect.CornerLabel.None;
				break;
			case 1:
				cornerLabel = FloatRect.CornerLabel.B;
				cornerLabel2 = FloatRect.CornerLabel.A;
				break;
			}
			break;
		case 1:
			switch (RectZone(viewPos, rect).y)
			{
			case -1:
				cornerLabel = FloatRect.CornerLabel.D;
				cornerLabel2 = FloatRect.CornerLabel.B;
				break;
			case 0:
				cornerLabel = FloatRect.CornerLabel.C;
				cornerLabel2 = FloatRect.CornerLabel.B;
				break;
			case 1:
				cornerLabel = FloatRect.CornerLabel.C;
				cornerLabel2 = FloatRect.CornerLabel.A;
				break;
			}
			break;
		}
		return new FloatRect.CornerLabel[2] { cornerLabel, cornerLabel2 };
	}

	public static Vector2 PushOutOfInvisibleArea(Vector2 viewPoint, Vector2 point, Vector2 lastPoint, FloatRect rct, bool useAcorner, bool useBcorner, bool useCcorner, bool useDcorner)
	{
		bool flag = PointBehindRect(viewPoint, lastPoint, rct) && PointBehindRect(viewPoint, point, rct);
		FloatRect.CornerLabel[] array = VisibleCornersOnRect(viewPoint, rct);
		IntVector2 intVector = RectZone(viewPoint, rct);
		float dst = float.MaxValue;
		Vector2 result = point;
		if (intVector.x != 0)
		{
			Vector2 vector = VerticalCrossPoint(lastPoint, point, (intVector.x < 0) ? rct.left : rct.right);
			if (vector.y > rct.bottom && vector.y < rct.top && DistLess(lastPoint, vector, dst) && (IsPointBetweenPoints(lastPoint, point, vector) || flag))
			{
				result = vector;
				dst = Vector2.Distance(lastPoint, vector);
			}
		}
		if (intVector.y != 0)
		{
			Vector2 vector = HorizontalCrossPoint(lastPoint, point, (intVector.y < 0) ? rct.bottom : rct.top);
			if (vector.x > rct.left && vector.x < rct.right && DistLess(lastPoint, vector, dst) && (IsPointBetweenPoints(lastPoint, point, vector) || flag))
			{
				result = vector;
				dst = Vector2.Distance(lastPoint, vector);
			}
		}
		for (int i = 0; i < 2; i++)
		{
			Vector2 vector = LineIntersection(viewPoint, rct.GetCorner(array[i]), lastPoint, point);
			if (DistLess(lastPoint, vector, dst) && (IsPointBetweenPoints(lastPoint, point, vector) || flag) && DistanceToLine(vector, rct.GetCorner(array[0]), rct.GetCorner(array[1])) > 0f)
			{
				result = vector;
				dst = Vector2.Distance(lastPoint, vector);
			}
		}
		return result;
	}

	public static Vector2 RandomPointInRect(FloatRect rct)
	{
		return new Vector2(Mathf.Lerp(rct.left, rct.right, UnityEngine.Random.value), Mathf.Lerp(rct.bottom, rct.top, UnityEngine.Random.value));
	}

	public static FloatRect RectCollision(Vector2 pos, Vector2 lastPos, FloatRect rct)
	{
		Vector2 vector = VerticalCrossPoint(lastPos, pos, rct.left);
		Vector2 vector2 = VerticalCrossPoint(lastPos, pos, rct.right);
		Vector2 vector3 = HorizontalCrossPoint(lastPos, pos, rct.bottom);
		Vector2 vector4 = HorizontalCrossPoint(lastPos, pos, rct.top);
		if (lastPos.x == pos.x)
		{
			vector3 = new Vector2(lastPos.x, rct.bottom);
			vector4 = new Vector2(lastPos.x, rct.top);
		}
		float dst = (rct.Vector2Inside(lastPos) ? float.MaxValue : Vector2.Distance(lastPos, pos));
		Vector2 upperRight = new Vector2(0f, 0f);
		Vector2 lowerLeft = pos;
		if (vector.y >= rct.bottom && vector.y <= rct.top && DistLess(lastPos, vector, dst))
		{
			lowerLeft = vector;
			dst = Vector2.Distance(lastPos, vector);
			upperRight = new Vector2(1f, 0f);
		}
		if (vector2.y >= rct.bottom && vector2.y <= rct.top && DistLess(lastPos, vector2, dst))
		{
			lowerLeft = vector2;
			dst = Vector2.Distance(lastPos, vector2);
			upperRight = new Vector2(-1f, 0f);
		}
		if (vector3.x >= rct.left && vector3.x <= rct.right && DistLess(lastPos, vector3, dst))
		{
			lowerLeft = vector3;
			dst = Vector2.Distance(lastPos, vector3);
			upperRight = new Vector2(0f, 1f);
		}
		if (vector4.x >= rct.left && vector4.x <= rct.right && DistLess(lastPos, vector4, dst))
		{
			lowerLeft = vector4;
			dst = Vector2.Distance(lastPos, vector4);
			upperRight = new Vector2(0f, -1f);
		}
		return FloatRect.MakeFromVector2(lowerLeft, upperRight);
	}

	public static bool TriContainsPoint(Vector2 p, Vector2 a, Vector2 b, Vector2 c)
	{
		Vector2 vector = c - a;
		Vector2 vector2 = b - a;
		Vector2 rhs = p - a;
		float num = Vector2.Dot(vector, vector);
		float num2 = Vector2.Dot(vector, vector2);
		float num3 = Vector2.Dot(vector, rhs);
		float num4 = Vector2.Dot(vector2, vector2);
		float num5 = Vector2.Dot(vector2, rhs);
		float num6 = 1f / (num * num4 - num2 * num2);
		float num7 = (num4 * num3 - num2 * num5) * num6;
		float num8 = (num * num5 - num2 * num3) * num6;
		if (num7 >= 0f && num8 >= 0f)
		{
			return num7 + num8 < 1f;
		}
		return false;
	}

	public static bool QuadPolyContainsPoint(Vector2 p, Vector2 a, Vector2 b, Vector2 c, Vector2 d)
	{
		if (!TriContainsPoint(p, a, b, c))
		{
			return TriContainsPoint(p, c, d, a);
		}
		return true;
	}

	public static bool AreIntVectorsNeighbors(IntVector2 A, IntVector2 B)
	{
		if (A.x == B.x && A.y == B.y)
		{
			return false;
		}
		if (A.x - B.x != 0 && A.y - B.y != 0)
		{
			return false;
		}
		if (Math.Abs(A.x - B.x) < 2)
		{
			return Math.Abs(A.y - B.y) < 2;
		}
		return false;
	}

	public static bool AreIntVectorsDiagonalNeighbors(IntVector2 A, IntVector2 B)
	{
		if (A.x == B.x || A.y == B.y)
		{
			return false;
		}
		if (Math.Abs(A.x - B.x) >= 2)
		{
			return Math.Abs(A.y - B.y) < 2;
		}
		return true;
	}

	public static bool IsPointBetweenPoints(Vector2 A, Vector2 B, Vector2 v2)
	{
		float x = A.x;
		float x2 = B.x;
		if (x > x2)
		{
			x = B.x;
			x2 = A.x;
		}
		float y = A.y;
		float y2 = B.y;
		if (y > y2)
		{
			y = B.y;
			y2 = A.y;
		}
		if (v2.x > x && v2.x < x2 && v2.y > y)
		{
			return v2.y < y2;
		}
		return false;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 VerticalCrossPoint(Vector2 A, Vector2 B, float X)
	{
		if (A.y == B.y)
		{
			return new Vector2(X, A.y);
		}
		float num = (A.y - B.y) / (A.x - B.x);
		float num2 = A.y - A.x * num;
		return new Vector2(X, num2 + num * X);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 HorizontalCrossPoint(Vector2 A, Vector2 B, float Y)
	{
		if (A.x == B.x)
		{
			return new Vector2(A.x, Y);
		}
		float num = (A.y - B.y) / (A.x - B.x);
		float num2 = A.y - A.x * num;
		return new Vector2((Y - num2) / num, Y);
	}

	public static Vector2 LineIntersection(Vector2 A1, Vector2 B1, Vector2 A2, Vector2 B2)
	{
		if (A1.x == B1.x)
		{
			return VerticalCrossPoint(A2, B2, A1.x);
		}
		if (A2.x == B2.x)
		{
			return VerticalCrossPoint(A1, B1, A2.x);
		}
		if (A1.y == B1.y)
		{
			return HorizontalCrossPoint(A2, B2, A1.y);
		}
		if (A2.y == B2.y)
		{
			return HorizontalCrossPoint(A1, B1, A2.y);
		}
		float num = (A1.y - B1.y) / (A1.x - B1.x);
		float num2 = A1.y - A1.x * num;
		float num3 = (A2.y - B2.y) / (A2.x - B2.x);
		float num4 = A2.y - A2.x * num3;
		float num5 = (num2 - num4) / (num3 - num);
		return new Vector2(num5, num4 + num3 * num5);
	}

	public static bool PointBehindRect(Vector2 lookingPoint, Vector2 lookedAtPoint, FloatRect rect)
	{
		FloatRect.CornerLabel[] array = VisibleCornersOnRect(lookingPoint, rect);
		bool flag = false;
		IntVector2 intVector = RectZone(lookingPoint, rect);
		if (intVector.x != 0)
		{
			if (intVector.x == -1)
			{
				flag = lookedAtPoint.x > rect.left;
			}
			else if (intVector.x == 1)
			{
				flag = lookedAtPoint.x < rect.right;
			}
		}
		else
		{
			flag = true;
		}
		if (flag && intVector.y != 0)
		{
			if (intVector.y == -1)
			{
				flag = lookedAtPoint.y > rect.bottom;
			}
			else if (intVector.y == 1)
			{
				flag = lookedAtPoint.y < rect.top;
			}
		}
		bool result = false;
		if (flag)
		{
			result = DistanceToLine(lookedAtPoint, rect.GetCorner(array[0]), lookingPoint) > 0f && DistanceToLine(lookedAtPoint, rect.GetCorner(array[1]), lookingPoint) < 0f;
		}
		return result;
	}

	public static IntVector2 PerpIntVec(IntVector2 intVec)
	{
		return new IntVector2(intVec.y, -intVec.x);
	}

	public static Vector2 ClosestPointOnLine(Vector2 A, Vector2 B, Vector2 P)
	{
		Vector2 vector = new Vector2(P.x - A.x, P.y - A.y);
		Vector2 vector2 = new Vector2(B.x - A.x, B.y - A.y);
		float num = Mathf.Pow(vector2.x, 2f) + Mathf.Pow(vector2.y, 2f);
		float num2 = (vector.x * vector2.x + vector.y * vector2.y) / num;
		return new Vector2(A.x + vector2.x * num2, A.y + vector2.y * num2);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static int ManhattanDistance(IntVector2 a, IntVector2 b)
	{
		return Math.Abs(a.x - b.x) + Math.Abs(a.y - b.y);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static int ManhattanDistance(WorldCoordinate a, WorldCoordinate b)
	{
		if (a.room != b.room)
		{
			return int.MaxValue;
		}
		return Math.Abs(a.x - b.x) + Math.Abs(a.y - b.y);
	}

	public static float WorldCoordFloatDist(WorldCoordinate a, WorldCoordinate b)
	{
		if (a.room != b.room || !a.TileDefined || !b.TileDefined)
		{
			return float.MaxValue;
		}
		return a.Tile.FloatDist(b.Tile);
	}

	public static float BetweenRoomsDistance(World world, WorldCoordinate a, WorldCoordinate b)
	{
		if (a.room == b.room)
		{
			return a.Tile.FloatDist(b.Tile);
		}
		if (world.GetAbstractRoom(a).ExitIndex(b.room) < 0 || world.GetAbstractRoom(b).ExitIndex(a.room) < 0)
		{
			return float.MaxValue;
		}
		float num = world.GetAbstractRoom(a).size.ToVector2().magnitude;
		float num2 = world.GetAbstractRoom(b).size.ToVector2().magnitude;
		if (world.GetAbstractRoom(a).realizedRoom != null && world.GetAbstractRoom(a).realizedRoom.shortCutsReady)
		{
			num = a.Tile.FloatDist(world.GetAbstractRoom(a).realizedRoom.LocalCoordinateOfNode(world.GetAbstractRoom(a).ExitIndex(b.room)).Tile);
		}
		if (world.GetAbstractRoom(b).realizedRoom != null && world.GetAbstractRoom(b).realizedRoom.shortCutsReady)
		{
			num2 = b.Tile.FloatDist(world.GetAbstractRoom(b).realizedRoom.LocalCoordinateOfNode(world.GetAbstractRoom(b).ExitIndex(a.room)).Tile);
		}
		return num + num2;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float DistanceToLine(Vector2 V, Vector2 l2, Vector2 l1)
	{
		return ((l2.y - l1.y) * V.x - (l2.x - l1.x) * V.y + l2.x * l1.y - l2.y * l1.x) / Mathf.Sqrt(Mathf.Pow(l2.y - l1.y, 2f) + Mathf.Pow(l2.x - l1.x, 2f));
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float DistanceToLine(float2 V, float2 l2, float2 l1)
	{
		return ((l2.y - l1.y) * V.x - (l2.x - l1.x) * V.y + l2.x * l1.y - l2.y * l1.x) / math.sqrt(math.pow(l2.y - l1.y, 2f) + math.pow(l2.x - l1.x, 2f));
	}

	public static bool BetweenLines(Vector2 V, Vector2 lA1, Vector2 lA2, Vector2 lB1, Vector2 lB2)
	{
		if (lA1 == lA2)
		{
			return PointInTriangle(V, lA1, lB1, lB2);
		}
		if (lA1 == lB1)
		{
			return PointInTriangle(V, lA1, lA2, lB2);
		}
		if (lA1 == lB2)
		{
			return PointInTriangle(V, lA1, lA2, lB1);
		}
		if (lA2 == lB1)
		{
			return PointInTriangle(V, lA1, lA2, lB2);
		}
		if (lA2 == lB2)
		{
			return PointInTriangle(V, lA1, lA2, lB1);
		}
		if (lB1 == lB2)
		{
			return PointInTriangle(V, lA1, lA2, lB1);
		}
		float num = DistanceToLine(V, lA1, lA2);
		if (num == 0f)
		{
			return true;
		}
		float num2 = DistanceToLine(V, lB1, lB2);
		if (num2 == 0f)
		{
			return true;
		}
		return Mathf.Sign(num) != Mathf.Sign(num2);
	}

	public static bool PointInTriangle(Vector2 pt, Vector2 v1, Vector2 v2, Vector2 v3)
	{
		bool num = DistanceToLine(pt, v1, v2) <= 0f;
		bool flag = DistanceToLine(pt, v2, v3) <= 0f;
		bool flag2 = DistanceToLine(pt, v3, v1) <= 0f;
		if (num == flag)
		{
			return flag == flag2;
		}
		return false;
	}

	public static WorldCoordinate MakeWorldCoordinate(IntVector2 pos, int room)
	{
		return new WorldCoordinate(room, pos.x, pos.y, -1);
	}

	public static WorldCoordinate MakeWorldCoordinate(IntVector2 pos, int room, int node)
	{
		return new WorldCoordinate(room, pos.x, pos.y, node);
	}

	public static float MinusOneToOneRangeFloatInfluence(float f, float infl)
	{
		if (Mathf.Sign(f) != (float)Math.Sign(infl) || Mathf.Abs(f) < Math.Abs(infl))
		{
			return Mathf.Lerp(f, infl, Mathf.Abs(infl));
		}
		return f;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 ClampAngle(Vector2 target, Vector2 vector, float minAngle, float maxAngle, float mixFactor = 1f)
	{
		float num = Vector2.SignedAngle(target, vector);
		num = Mathf.Lerp(num, Mathf.Clamp(num, minAngle, maxAngle), mixFactor);
		return RotateAroundOrigo(target, 0f - num).normalized * vector.magnitude;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float SCurve(float x, float k)
	{
		x = x * 2f - 1f;
		if (x < 0f)
		{
			x = Mathf.Abs(1f + x);
			return k * x / (k - x + 1f) * 0.5f;
		}
		k = -1f - k;
		return 0.5f + k * x / (k - x + 1f) * 0.5f;
	}

	public static float BackwardsSCurve(float x, float k)
	{
		x = x * 2f - 1f;
		if (x < 0f)
		{
			x = Mathf.Abs(1f + x);
			k = -1f - k;
			return k * x / (k - x + 1f) * 0.5f;
		}
		return 0.5f + k * x / (k - x + 1f) * 0.5f;
	}

	public static Vector2 InverseKinematic(Vector2 va, Vector2 vc, float A, float B, float flip)
	{
		float num = Vector2.Distance(va, vc);
		float num2 = Mathf.Acos(Mathf.Clamp((num * num + A * A - B * B) / (2f * num * A), 0.2f, 0.98f)) * (flip * 180f / (float)Math.PI);
		return va + DegToVec(AimFromOneVectorToAnother(va, vc) + num2) * A;
	}

	private static float RandomDeviation(float k)
	{
		return SCurve(UnityEngine.Random.value * 0.5f, k) * 2f * ((UnityEngine.Random.value < 0.5f) ? 1f : (-1f));
	}

	public static float ClampedRandomVariation(float baseValue, float maxDeviation, float k)
	{
		return Mathf.Clamp(baseValue + RandomDeviation(k) * maxDeviation, 0f, 1f);
	}

	public static float WrappedRandomVariation(float baseValue, float maxDeviation, float k)
	{
		float num = baseValue + RandomDeviation(k) * maxDeviation + 1f;
		return num - Mathf.Floor(num);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector2 RNV()
	{
		return DegToVec(UnityEngine.Random.value * 360f);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float2 RNVf2()
	{
		return DegToFloat2(UnityEngine.Random.value * 360f);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static Vector3 RNV3()
	{
		return new Vector3(UnityEngine.Random.Range(-1f, 1f), UnityEngine.Random.Range(-1f, 1f), UnityEngine.Random.Range(-1f, 1f)).normalized;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static float LerpMap(float val, float fromA, float toA, float fromB, float toB)
	{
		return math.lerp(fromB, toB, Mathf.InverseLerp(fromA, toA, val));
	}

	public static float LerpMap(float val, float fromA, float toA, float fromB, float toB, float exponent)
	{
		return math.lerp(fromB, toB, Mathf.Pow(Mathf.InverseLerp(fromA, toA, val), exponent));
	}

	public static float ExponentMap(float val, float rangeLower, float rangeHigher, float exponent)
	{
		return Mathf.Lerp(rangeLower, rangeHigher, Mathf.Pow(Mathf.InverseLerp(rangeLower, rangeHigher, val), exponent));
	}

	public static float Screen(float A, float B)
	{
		return 1f - (1f - Mathf.Clamp(A, 0f, 1f)) * (1f - Mathf.Clamp(B, 0f, 1f));
	}

	public static float PushFromHalf(float val, float pushExponent)
	{
		if (val == 0.5f)
		{
			return 0.5f;
		}
		if (val < 0.5f)
		{
			return LerpMap(val, 0f, 0.5f, 0f, 0.5f, pushExponent);
		}
		return LerpMap(val, 1f, 0.5f, 1f, 0.5f, pushExponent);
	}

	public static Color HSL2RGB(float h, float sl, float l)
	{
		float r = l;
		float g = l;
		float b = l;
		float num = (((double)l <= 0.5) ? (l * (1f + sl)) : (l + sl - l * sl));
		if (num > 0f)
		{
			float num2 = l + l - num;
			float num3 = (num - num2) / num;
			h *= 6f;
			int num4 = (int)h;
			float num5 = h - (float)num4;
			float num6 = num * num3 * num5;
			float num7 = num2 + num6;
			float num8 = num - num6;
			switch (num4)
			{
			case 0:
				r = num;
				g = num7;
				b = num2;
				break;
			case 1:
				r = num8;
				g = num;
				b = num2;
				break;
			case 2:
				r = num2;
				g = num;
				b = num7;
				break;
			case 3:
				r = num2;
				g = num8;
				b = num;
				break;
			case 4:
				r = num7;
				g = num2;
				b = num;
				break;
			case 5:
				r = num;
				g = num2;
				b = num8;
				break;
			}
		}
		return new Color(r, g, b);
	}

	public static Color HSL2RGB(float h, float sl, float l, float a)
	{
		Color color = HSL2RGB(h, sl, l);
		return new Color(color.r, color.g, color.b, a);
	}

	public static Color RGB2RGBA(Color col, float alpha)
	{
		return new Color(col.r, col.g, col.b, alpha);
	}

	public static Color RGBA2RGB(Color col)
	{
		return new Color(col.r, col.g, col.b);
	}

	public static Vector3 ColorToVec3(Color col)
	{
		return new Vector3(-1f + 2f * col.r, -1f + 2f * col.g, -1f + 2f * col.b);
	}

	public static Color Vec3ToColor(Vector3 vec)
	{
		return new Color(Mathf.InverseLerp(-1f, 1f, vec.x), Mathf.InverseLerp(-1f, 1f, vec.y), Mathf.InverseLerp(-1f, 1f, vec.z));
	}

	public static Color Desaturate(Color col, float desaturate)
	{
		return Color.Lerp(col, new Color((col.r + col.g + col.b) / 3f, (col.r + col.g + col.b) / 3f, (col.r + col.g + col.b) / 3f), desaturate);
	}

	public static Color Saturate(Color col, float saturate)
	{
		float a = Mathf.Min(col.r, col.g, col.b);
		float b = Mathf.Max(col.r, col.g, col.b);
		return Color.Lerp(col, new Color(Mathf.InverseLerp(a, b, col.r), Mathf.InverseLerp(a, b, col.g), Mathf.InverseLerp(a, b, col.b)), saturate);
	}

	public static float QuickSaturation(Color col)
	{
		return Mathf.InverseLerp(Mathf.Max(col.r, col.g, col.b), 0f, Mathf.Min(col.r, col.g, col.b));
	}

	public static float DistanceBetweenZeroToOneFloats(float a, float b)
	{
		return Math.Min(Math.Min(Math.Abs(a - b), Math.Abs(a + 1f - b)), Math.Abs(a - 1f - b));
	}

	public static Vector2 ClosestPointOnLineSegment(Vector2 A, Vector2 B, Vector2 testPos)
	{
		Vector2 vector = PerpendicularVector((A - B).normalized);
		if (DistanceToLine(testPos, A + vector, A - vector) >= 0f)
		{
			return A;
		}
		if (DistanceToLine(testPos, B + vector, B - vector) <= 0f)
		{
			return B;
		}
		return ClosestPointOnLine(A, B, testPos);
	}

	public static Vector3 Vec3FromVec2(Vector2 v, float f)
	{
		return new Vector3(v.x, v.y, f);
	}

	public static string xorEncrypt(string sA, int displace)
	{
		displace = Math.Abs(displace * 82 + displace / 3 + displace % 322 - displace % 17 - displace * 7 % 811);
		string text = "";
		string encryptionString = EncryptionString;
		for (int i = 0; i < sA.Length; i++)
		{
			text += (char)(sA[i] ^ encryptionString[(i + displace) % encryptionString.Length]);
		}
		return text;
	}

	public static string Md5Sum(string strToEncrypt)
	{
		byte[] bytes = new UTF8Encoding().GetBytes(strToEncrypt + CheckSumSalt);
		byte[] array = new MD5CryptoServiceProvider().ComputeHash(bytes);
		string text = "";
		for (int i = 0; i < array.Length; i++)
		{
			text += Convert.ToString(array[i], 16).PadLeft(2, '0');
		}
		return text.PadLeft(32, '0');
	}

	public static string ToLiteral(string input)
	{
		StringBuilder stringBuilder = new StringBuilder(input.Length);
		foreach (char c in input)
		{
			switch (c)
			{
			case '"':
				stringBuilder.Append("\\\"");
				break;
			case '\\':
				stringBuilder.Append("\\\\");
				break;
			case '\0':
				stringBuilder.Append("\\0");
				break;
			case '\a':
				stringBuilder.Append("\\a");
				break;
			case '\b':
				stringBuilder.Append("\\b");
				break;
			case '\f':
				stringBuilder.Append("\\f");
				break;
			case '\n':
				stringBuilder.Append("\\n");
				break;
			case '\r':
				stringBuilder.Append("\\r");
				break;
			case '\t':
				stringBuilder.Append("\\t");
				break;
			case '\v':
				stringBuilder.Append("\\v");
				break;
			default:
				stringBuilder.Append(c);
				break;
			}
		}
		return stringBuilder.ToString();
	}

	public static string GetFont()
	{
		if (ModManager.NonPrepackagedModsInstalled && ModManager.InitializationScreenFinished && rainWorld != null && rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.TraditionalChinese)
		{
			return "font" + LocalizationTranslator.LangShort(InGameTranslator.LanguageID.Chinese) + "Full";
		}
		if (ModManager.NonPrepackagedModsInstalled && ModManager.InitializationScreenFinished && rainWorld != null && (rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.Korean || rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.Japanese || rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.Chinese))
		{
			return "font" + LocalizationTranslator.LangShort(rainWorld.inGameTranslator.currentLanguage) + "Full";
		}
		if (rainWorld != null && rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.TraditionalChinese)
		{
			return "font" + LocalizationTranslator.LangShort(InGameTranslator.LanguageID.Chinese);
		}
		if (!(rainWorld == null) && (!(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Japanese) || !(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Korean) || !(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Chinese) || !(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Russian) || !(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Thai)))
		{
			return "font" + LocalizationTranslator.LangShort(rainWorld.inGameTranslator.currentLanguage);
		}
		return "font";
	}

	public static string GetDisplayFont()
	{
		if (ModManager.NonPrepackagedModsInstalled && ModManager.InitializationScreenFinished && rainWorld != null && rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.TraditionalChinese)
		{
			return "DisplayFont" + LocalizationTranslator.LangShort(InGameTranslator.LanguageID.Chinese) + "Full";
		}
		if (ModManager.NonPrepackagedModsInstalled && ModManager.InitializationScreenFinished && rainWorld != null && (rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.Korean || rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.Japanese || rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.Chinese))
		{
			return "DisplayFont" + LocalizationTranslator.LangShort(rainWorld.inGameTranslator.currentLanguage) + "Full";
		}
		if (rainWorld != null && rainWorld.inGameTranslator.currentLanguage == InGameTranslator.LanguageID.TraditionalChinese)
		{
			return "DisplayFont" + LocalizationTranslator.LangShort(InGameTranslator.LanguageID.Chinese);
		}
		if (!(rainWorld == null) && (!(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Japanese) || !(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Korean) || !(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Chinese) || !(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Russian) || !(rainWorld.inGameTranslator.currentLanguage != InGameTranslator.LanguageID.Thai)))
		{
			return "DisplayFont" + LocalizationTranslator.LangShort(rainWorld.inGameTranslator.currentLanguage);
		}
		return "DisplayFont";
	}

	public static float SignZero(float val)
	{
		if (val == 0f)
		{
			return 0f;
		}
		return Mathf.Sign(val);
	}

	public static Vector2 rotateVectorDeg(Vector2 vec, float degAng)
	{
		degAng *= -(float)Math.PI / 180f;
		return new Vector2(vec.x * Mathf.Cos(degAng) - vec.y * Mathf.Sin(degAng), vec.x * Mathf.Sin(degAng) + vec.y * Mathf.Cos(degAng));
	}

	public static Color hexToColor(string hex)
	{
		return new Color((float)Convert.ToInt32(hex.Substring(0, 2), 16) / 255f, (float)Convert.ToInt32(hex.Substring(2, 2), 16) / 255f, (float)Convert.ToInt32(hex.Substring(4, 2), 16) / 255f);
	}

	public static string colorToHex(Color col)
	{
		return Mathf.RoundToInt(col.r * 255f).ToString("X2") + Mathf.RoundToInt(col.g * 255f).ToString("X2") + Mathf.RoundToInt(col.b * 255f).ToString("X2");
	}

	public static Vector3 RGB2HSL(Color color)
	{
		float num = Mathf.Max(Mathf.Max(color.r, color.g), color.b);
		float num2 = Mathf.Min(Mathf.Min(color.r, color.g), color.b);
		float num3 = (num + num2) / 2f;
		float y;
		float x;
		if (num == num2)
		{
			x = (y = 0f);
		}
		else
		{
			float num4 = num - num2;
			y = ((num3 > 0.5f) ? (num4 / (2f - num - num2)) : (num4 / (num + num2)));
			x = ((num == color.r) ? ((color.g - color.b) / num4 + ((color.g < color.b) ? 6f : 0f)) : ((num != color.g) ? ((color.r - color.g) / num4 + 4f) : ((color.b - color.r) / num4 + 2f)));
			x /= 6f;
		}
		return new Vector3(x, y, num3);
	}

	public static Vector3 RGB2Vec3(Color color)
	{
		return new Vector3(color.r, color.g, color.b);
	}

	public static Vector2 EncodeFloatRG(float v)
	{
		Vector2 vector = new Vector2(1f, 255f);
		float num = 0.003921569f;
		Vector2 result = vector * v;
		result.x %= 1f;
		result.y %= 1f;
		result.x -= result.y * num;
		return result;
	}

	public static float Mod(float f, float d)
	{
		f %= d;
		f = ((f < 0f) ? (d + f) : f);
		return f;
	}

	public static bool PointInPoly4(Vector2 p, Vector2 r1, Vector2 r2, Vector2 r3, Vector2 r4)
	{
		if (!PointInTriangle(p, r1, r2, r3))
		{
			return PointInTriangle(p, r3, r4, r1);
		}
		return true;
	}

	public static float TriArea(Vector2 p1, Vector2 p2, Vector2 p3)
	{
		return Mathf.Abs(p2.x * p1.y - p1.x * p2.y + (p3.x * p2.x - p2.x * p3.x) + (p1.x * p3.y - p3.x * p1.y)) / 2f;
	}

	public static string ToTitleCase(string str)
	{
		return new CultureInfo("en-US", useUserOverride: false).TextInfo.ToTitleCase(str);
	}

	public static string GetBaseFileNameWithoutPrefix(string path, string prefix)
	{
		string fileNameWithoutExtension = Path.GetFileNameWithoutExtension(path);
		if (fileNameWithoutExtension.Contains(prefix))
		{
			return fileNameWithoutExtension.Substring(fileNameWithoutExtension.IndexOf(prefix) + prefix.Length);
		}
		return fileNameWithoutExtension;
	}

	public static string ValidateSpacedDelimiter(string s, string delimiter)
	{
		if (s.EndsWith(delimiter))
		{
			return s + " ";
		}
		return s;
	}

	public static float LerpQuadEaseIn(float start, float end, float perc)
	{
		return (end - start) * perc * perc + start;
	}

	public static float LerpQuadEaseOut(float start, float end, float perc)
	{
		float num = 0f - (1f - perc) * (1f - perc) + 1f;
		return (end - start) * num + start;
	}

	public static float LerpSinEaseInOut(float start, float end, float perc)
	{
		return (0f - (end - start)) / 2f * (Mathf.Cos(perc * (float)Math.PI) - 1f) + start;
	}

	public static float LerpExpEaseIn(float start, float end, float perc)
	{
		float num = Mathf.Pow(2f, 10f * (perc - 1f));
		return (end - start) * num + start;
	}

	public static float LerpExpEaseOut(float start, float end, float perc)
	{
		float num = 0f - Mathf.Pow(2f, 10f * (0f - perc)) + 1f;
		return (end - start) * num + start;
	}

	public static float LerpQuadEaseInOut(float start, float end, float perc)
	{
		float num = ((!(perc < 0.5f)) ? (-1f + (4f - 2f * perc) * perc) : (perc * perc * 2f));
		return (end - start) * num + start;
	}

	public static float LerpQuadEaseOutIn(float start, float end, float perc)
	{
		float num = ((!(perc < 0.5f)) ? (1f - Mathf.Sqrt(1f - perc) / Mathf.Sqrt(2f)) : Mathf.Sqrt(perc / 2f));
		return (end - start) * num + start;
	}

	public static float LerpCircEaseIn(float start, float end, float perc)
	{
		float num = 1f - Mathf.Sqrt(1f - perc * perc);
		return (end - start) * num + start;
	}

	public static float LerpCircEaseOut(float start, float end, float perc)
	{
		float num = 0f - (1f - Mathf.Sqrt(1f - (1f - perc) * (1f - perc))) + 1f;
		return (end - start) * num + start;
	}

	public static float LerpCircEaseInOut(float start, float end, float perc)
	{
		float num = ((!(perc < 0.5f)) ? (0.5f * (Mathf.Sqrt(1f - (2f * perc - 2f) * (2f * perc - 2f)) + 1f)) : (-0.5f * (Mathf.Sqrt(1f - 4f * perc * perc) - 1f)));
		return (end - start) * num + start;
	}

	public static float LerpCircEaseOutIn(float start, float end, float perc)
	{
		float num = ((!(perc < 0.5f)) ? (1f - Mathf.Sqrt(perc - perc * perc)) : Mathf.Sqrt(perc - perc * perc));
		return (end - start) * num + start;
	}

	public static float LerpExpEaseInOut(float start, float end, float perc)
	{
		float num = ((!(perc < 0.5f)) ? (0.5f * (0f - Mathf.Pow(2f, -10f * (2f * perc - 1f))) + 1f) : (0.5f * Mathf.Pow(2f, 10f * (2f * perc - 1f))));
		return (end - start) * num + start;
	}

	public static float LerpExpEaseOutIn(float start, float end, float perc)
	{
		float num = ((perc <= 0f) ? 0f : ((perc >= 1f) ? 1f : ((!(perc < 0.5f)) ? (Mathf.Log(-512f / (perc - 1f)) / (20f * Mathf.Log(2f))) : (Mathf.Log(2048f * perc) / (20f * Mathf.Log(2f))))));
		return (end - start) * num + start;
	}

	public static float LerpBackEaseIn(float start, float end, float perc)
	{
		float num = perc * perc * (2.70158f * perc - 1.70158f);
		return (end - start) * num + start;
	}

	public static float LerpBackEaseOut(float start, float end, float perc)
	{
		float num = 0f - (1f - perc) * (1f - perc) * (2.70158f * (1f - perc) - 1.70158f) + 1f;
		return (end - start) * num + start;
	}

	public static float LerpBackEaseInOut(float start, float end, float perc)
	{
		float num = ((!(perc < 0.5f)) ? (0.5f * ((2f * perc - 2f) * (2f * perc - 2f) * (3.59490943f * (2f * perc - 2f) + 2.59490943f) + 2f)) : (2f * perc * perc * (7.189819f * perc - 2.59490943f)));
		return (end - start) * num + start;
	}

	public static float LerpBackEaseOutIn(float start, float end, float perc)
	{
		float num = ((!(perc >= 0.5f)) ? (0.5f * ((2f * (perc + 0.5f) - 2f) * (2f * (perc + 0.5f) - 2f) * (3.59490943f * (2f * (perc + 0.5f) - 2f) + 2.59490943f) + 2f) - 0.5f) : (2f * (perc - 0.5f) * (perc - 0.5f) * (7.189819f * (perc - 0.5f) - 2.59490943f) + 0.5f));
		return (end - start) * num + start;
	}

	public static float LerpElasticEaseIn(float start, float end, float perc)
	{
		float num = 0f - Mathf.Pow(2f, 10f * (perc - 1f)) * Mathf.Sin((perc - 1.1f) * 2f * (float)Math.PI / 0.4f);
		return (end - start) * num + start;
	}

	public static float LerpElasticEaseOut(float start, float end, float perc)
	{
		float num = Mathf.Pow(2f, -10f * perc) * Mathf.Sin((perc - 0.1f) * 2f * (float)Math.PI / 0.4f) + 1f;
		return (end - start) * num + start;
	}

	public static float LerpElasticEaseInOut(float start, float end, float perc)
	{
		float num = ((!(perc < 0.5f)) ? (0.5f * Mathf.Pow(2f, -10f * (2f * perc - 1f)) * Mathf.Sin((2f * perc - 1f - 0.1f) * 2f * (float)Math.PI / 0.4f) + 1f) : (-0.5f * Mathf.Pow(2f, 10f * (2f * perc - 1f)) * Mathf.Sin((2f * perc - 1f - 0.1f) * 2f * (float)Math.PI / 0.4f)));
		return (end - start) * num + start;
	}

	public static float LerpElasticEaseOutIn(float start, float end, float perc)
	{
		float num = ((!(perc >= 0.5f)) ? (0.5f * Mathf.Pow(2f, -10f * (2f * (perc + 0.5f) - 1f)) * Mathf.Sin((2f * (perc + 0.5f) - 1f - 0.1f) * 2f * (float)Math.PI / 0.4f) + 1f - 0.5f) : (-0.5f * Mathf.Pow(2f, 10f * (2f * (perc - 0.5f) - 1f)) * Mathf.Sin((2f * (perc - 0.5f) - 1f - 0.1f) * 2f * (float)Math.PI / 0.4f) + 0.5f));
		return (end - start) * num + start;
	}

	public static float InverseLerpUnclamped(float a, float b, float t)
	{
		return (t - a) / (b - a);
	}

	public static float[] GetScreenOffsets()
	{
		float[] array = new float[2];
		if (rainWorld == null)
		{
			return array;
		}
		float x = rainWorld.screenSize.x;
		if (x == 1366f)
		{
			array[0] = 0f;
			array[1] = 1366f;
		}
		else if (x == 1360f)
		{
			array[0] = 3f;
			array[1] = 1363f;
		}
		else if (x == 1280f)
		{
			array[0] = 43f;
			array[1] = 1323f;
		}
		else if (x == 1229f)
		{
			array[0] = 69f;
			array[1] = 1297f;
		}
		else
		{
			array[0] = 171f;
			array[1] = 1195f;
		}
		return array;
	}

	public static string SecondsToMinutesAndSecondsString(int seconds)
	{
		int num = Mathf.FloorToInt((float)seconds / 60f);
		int num2 = Mathf.FloorToInt((float)seconds / 3600f);
		num -= num2 * 60;
		seconds -= num2 * 60 * 60;
		seconds -= num * 60;
		if (num2 > 0)
		{
			return num2.ToString("D2") + ":" + num.ToString("D2") + ":" + seconds.ToString("D2");
		}
		if (num > 0)
		{
			return num.ToString("D2") + ":" + seconds.ToString("D2");
		}
		return seconds.ToString("D2");
	}

	public static string GetIGTFormat(this TimeSpan timeSpan, bool includeMilliseconds)
	{
		string text = string.Format("{0:D3}h:{1:D2}m:{2:D2}s", new object[3]
		{
			timeSpan.Hours + timeSpan.Days * 24,
			timeSpan.Minutes,
			timeSpan.Seconds
		});
		if (!includeMilliseconds)
		{
			return text;
		}
		return text + $":{timeSpan.Milliseconds:000}ms";
	}

	public static Vector2 RotateLerp(Vector2 a, Vector2 b, float t)
	{
		if (a == Vector2.zero)
		{
			return b * t;
		}
		if (b == Vector2.zero)
		{
			return a * t;
		}
		float num = Mathf.Lerp(a.magnitude, b.magnitude, t);
		float f = Mathf.LerpAngle(a.GetAngle(), b.GetAngle(), t) * ((float)Math.PI / 180f);
		return new Vector2(Mathf.Cos(f), Mathf.Sin(f)) * num;
	}
}
