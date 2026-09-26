using System.Runtime.CompilerServices;
using Unity.Mathematics;
using UnityEngine;

namespace RWCustom;

public struct IntVector2
{
	public int x;

	public int y;

	public IntVector2(int p1, int p2)
	{
		x = p1;
		y = p2;
	}

	public override bool Equals(object obj)
	{
		if (obj == null || !(obj is IntVector2))
		{
			return false;
		}
		return Equals((IntVector2)obj);
	}

	public bool Equals(IntVector2 vector)
	{
		if (x == vector.x)
		{
			return y == vector.y;
		}
		return false;
	}

	public override int GetHashCode()
	{
		return base.GetHashCode();
	}

	public static IntVector2 operator +(IntVector2 a, IntVector2 b)
	{
		return new IntVector2(a.x + b.x, a.y + b.y);
	}

	public static IntVector2 operator -(IntVector2 a, IntVector2 b)
	{
		return new IntVector2(a.x - b.x, a.y - b.y);
	}

	public static Vector2 ToVector2(IntVector2 a)
	{
		return new Vector2(a.x, a.y);
	}

	public static IntVector2 operator *(IntVector2 a, int b)
	{
		return new IntVector2(a.x * b, a.y * b);
	}

	public static bool operator ==(IntVector2 a, IntVector2 b)
	{
		if (a.x == b.x)
		{
			return a.y == b.y;
		}
		return false;
	}

	public static bool operator !=(IntVector2 a, IntVector2 b)
	{
		if (a.x == b.x)
		{
			return a.y != b.y;
		}
		return true;
	}

	public static IntVector2 ClampAtOne(IntVector2 a)
	{
		IntVector2 result = new IntVector2(a.x, a.y);
		if (result.x < -1)
		{
			result.x = -1;
		}
		else if (result.x > 1)
		{
			result.x = 1;
		}
		if (result.y < -1)
		{
			result.y = -1;
		}
		else if (result.y > 1)
		{
			result.y = 1;
		}
		return result;
	}

	public static IntVector2 RectClamp(IntVector2 vec, int left, int bottom, int right, int top)
	{
		if (vec.x < left)
		{
			vec.x = left;
		}
		else if (vec.x > right)
		{
			vec.x = right;
		}
		if (vec.y > top)
		{
			vec.y = top;
		}
		else if (vec.y < bottom)
		{
			vec.y = bottom;
		}
		return vec;
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public Vector2 ToVector2()
	{
		return new Vector2(x, y);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public static IntVector2 FromVector2(Vector2 v)
	{
		return new IntVector2((int)v.x, (int)v.y);
	}

	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	public float FloatDist(IntVector2 otherVector)
	{
		return math.distance(new float2(x, y), new float2(otherVector.x, otherVector.y));
	}

	public override string ToString()
	{
		return "x: " + x + ", y: " + y;
	}
}
