using System;
using RWCustom;
using Unity.Burst.CompilerServices;
using Unity.Jobs;
using Unity.Mathematics;
using UnityEngine;

namespace CoralBrain;

public class Mycelium
{
	public struct MyceliaConnection : IEquatable<MyceliaConnection>
	{
		public Mycelium A;

		public Mycelium B;

		public bool Equals(MyceliaConnection other)
		{
			if (object.Equals(A, other.A))
			{
				return object.Equals(B, other.B);
			}
			return false;
		}

		public override bool Equals(object obj)
		{
			if (obj is MyceliaConnection other)
			{
				return Equals(other);
			}
			return false;
		}

		public override int GetHashCode()
		{
			return (((A != null) ? A.GetHashCode() : 0) * 397) ^ ((B != null) ? B.GetHashCode() : 0);
		}

		public static bool operator ==(MyceliaConnection left, MyceliaConnection right)
		{
			return left.Equals(right);
		}

		public static bool operator !=(MyceliaConnection left, MyceliaConnection right)
		{
			return !left.Equals(right);
		}

		public MyceliaConnection(Mycelium A, Mycelium B)
		{
			this.A = A;
			this.B = B;
		}

		public Mycelium Other(Mycelium me)
		{
			if (me == A)
			{
				return B;
			}
			return A;
		}
	}

	public Vector2[,] points;

	public float conRad;

	public Color color;

	public CoralNeuronSystem system;

	public IOwnMycelia owner;

	public int index;

	public float length;

	public MyceliaConnection connection;

	public int lastCameraCullTick;

	public bool viewedByCamera;

	public bool useStaticCulling;

	public bool culled;

	public bool lastCulled;

	public bool moveAwayFromWalls = true;

	public int rest;

	private JobData _jobDataStep1;

	private JobHandle handleJob01;

	public Vector2 Tip => points[points.GetLength(0) - 1, 0];

	public Vector2 Base => points[0, 0];

	public Mycelium(CoralNeuronSystem system, IOwnMycelia owner, int index, float length, Vector2 initPoint)
	{
		lastCameraCullTick = -1;
		useStaticCulling = true;
		this.system = system;
		system?.mycelia.Add(this);
		this.owner = owner;
		this.index = index;
		this.length = length;
		float num = Mathf.Max(length, Mathf.Lerp(length, 40f, 0.5f));
		points = new Vector2[Custom.IntClamp((int)(num / 15f), 2, 20), 3];
		conRad = length / (float)points.GetLength(0);
		Reset(initPoint);
		_jobDataStep1 = default(JobData);
		_jobDataStep1.naFourDirections = new int2[4];
		_jobDataStep1.naFourDirections[0] = new int2(-1, 0);
		_jobDataStep1.naFourDirections[1] = new int2(0, -1);
		_jobDataStep1.naFourDirections[2] = new int2(1, 0);
		_jobDataStep1.naFourDirections[3] = new int2(0, 1);
		_jobDataStep1.nativePoints = new float2[points.GetLength(0) * 3];
		_jobDataStep1.outPoints = new Vector2[points.GetLength(0) * 3];
	}

	public void ConnectSystem(CoralNeuronSystem newSystem)
	{
		system = newSystem;
		newSystem?.mycelia.Add(this);
	}

	public void Reset(Vector2 resetPos)
	{
		Vector2 vector = resetPos + length * 0.6f * owner.ResetDir(index);
		Vector2 cA = resetPos + (Custom.DirVec(resetPos, vector) + Custom.RNV()).normalized * (Vector2.Distance(resetPos, vector) * 0.5f);
		Vector2 cB = vector + (Custom.DirVec(vector, resetPos) + Custom.RNV()).normalized * (Vector2.Distance(resetPos, vector) * 0.5f);
		for (int i = 0; i < points.GetLength(0); i++)
		{
			points[i, 0] = Custom.Bezier(resetPos, cA, vector, cB, (float)i / (float)(points.GetLength(0) - 1)) + Custom.RNV();
			points[i, 1] = points[i, 0];
			points[i, 2] = Custom.RNV();
		}
	}

	public void Update()
	{
		if (useStaticCulling)
		{
			culled = (system != null && system.Frozen) || !viewedByCamera;
		}
		else
		{
			culled = system != null && system.Frozen;
		}
		if (lastCameraCullTick != owner.OwnerRoom.camerasChangedTick)
		{
			viewedByCamera = owner.OwnerRoom.ViewedByAnyCamera(Base, length + 50f);
			lastCameraCullTick = owner.OwnerRoom.camerasChangedTick;
		}
		if (lastCulled && !culled)
		{
			Reset(owner.ConnectionPos(index, 1f));
		}
		lastCulled = culled;
		if (culled || owner.OwnerRoom.aimap == null)
		{
			return;
		}
		int num = points.GetLength(0);
		ExtraExtentions.Indexer indexer = default(ExtraExtentions.Indexer);
		indexer.width = 3;
		ExtraExtentions.Indexer indexer2 = indexer;
		for (int i = 0; i < num && indexer2.ind(i, 2) < points.Length; i++)
		{
			float2 @float = new float2(points[i, 0].x, points[i, 0].y);
			float2 float2 = new float2(points[i, 2].x, points[i, 2].y);
			_jobDataStep1.nativePoints[indexer2.ind(i, 0)] = @float + float2;
			_jobDataStep1.nativePoints[indexer2.ind(i, 1)] = @float;
			_jobDataStep1.nativePoints[indexer2.ind(i, 2)] = float2 * 0.999f;
		}
		Phase1(num);
		Phase4();
		if (owner != null)
		{
			points[0, 0] = owner.ConnectionPos(index, 1f);
			points[0, 2] *= 0f;
		}
		if (rest > 0)
		{
			rest--;
		}
		if (connection != default(MyceliaConnection))
		{
			if (connection.Other(this).connection != connection || !Custom.DistLess(connection.A.Base, connection.B.Base, connection.A.length + connection.B.length) || UnityEngine.Random.value < 0.005f)
			{
				connection = default(MyceliaConnection);
				rest = UnityEngine.Random.Range(20, 200);
				return;
			}
			Mycelium mycelium = connection.Other(this);
			if (Custom.DistLess(mycelium.Tip, Tip, 10f))
			{
				Vector2 vector = Custom.DirVec(Tip, mycelium.Tip);
				float num2 = Vector2.Distance(Tip, mycelium.Tip);
				Vector2 vector2 = vector * ((num2 - 1f) * 0.5f);
				points[points.GetLength(0) - 1, 0] += vector2;
				points[points.GetLength(0) - 1, 2] += vector2;
				mycelium.points[mycelium.points.GetLength(0) - 1, 0] -= vector2;
				mycelium.points[mycelium.points.GetLength(0) - 1, 2] -= vector2;
				if (UnityEngine.Random.value < 0.05f)
				{
					owner.OwnerRoom.AddObject(new NeuronSpark((mycelium.Tip + Tip) / 2f));
				}
			}
			else
			{
				points[points.GetLength(0) - 1, 2] = Vector2.Lerp(points[points.GetLength(0) - 1, 2], Vector2.ClampMagnitude(mycelium.Tip - Tip, 5f), 0.5f);
			}
		}
		else if (system != null && rest < 1 && system.mycelia.Count > 0)
		{
			Mycelium mycelium2 = system.mycelia[UnityEngine.Random.Range(0, system.mycelia.Count)];
			if (mycelium2 != this && mycelium2.owner != owner && mycelium2.connection == default(MyceliaConnection) && Custom.DistLess(Base, mycelium2.Base, (length + mycelium2.length) * 0.75f))
			{
				connection = new MyceliaConnection(this, mycelium2);
				mycelium2.connection = connection;
			}
		}
	}

	private void Phase4()
	{
		_jobDataStep1.outPoints.CopyToAlt(points);
	}

	private void Phase1(int pointsDim0Length)
	{
		int width = 3;
		ExtraExtentions.Indexer indexer = default(ExtraExtentions.Indexer);
		indexer.width = width;
		ExtraExtentions.Indexer indexer2 = indexer;
		float2[] nativePoints = _jobDataStep1.nativePoints;
		for (int i = 0; i < pointsDim0Length; i++)
		{
			if (Hint.Likely(i > 0))
			{
				float2 f = new float2(nativePoints[indexer2.ind(i, 0)].x - nativePoints[indexer2.ind(i - 1, 0)].x, nativePoints[indexer2.ind(i, 0)].y - nativePoints[indexer2.ind(i - 1, 0)].y);
				float num = f.magnitude();
				float2 @float = f.normalized();
				float2 float2 = new float2(@float.x * (conRad - num) * 0.5f, @float.y * (conRad - num) * 0.5f);
				nativePoints[indexer2.ind(i, 0)] = new float2(nativePoints[indexer2.ind(i, 0)].x + float2.x, nativePoints[indexer2.ind(i, 0)].y + float2.y);
				nativePoints[indexer2.ind(i, 2)] = new float2(nativePoints[indexer2.ind(i, 2)].x + float2.x, nativePoints[indexer2.ind(i, 2)].y + float2.y);
				nativePoints[indexer2.ind(i - 1, 0)] = new float2(nativePoints[indexer2.ind(i - 1, 0)].x - float2.x, nativePoints[indexer2.ind(i - 1, 0)].y - float2.y);
				nativePoints[indexer2.ind(i - 1, 2)] = new float2(nativePoints[indexer2.ind(i - 1, 2)].x - float2.x, nativePoints[indexer2.ind(i - 1, 2)].y - float2.y);
				if (Hint.Likely(i > 1))
				{
					@float = new float2(nativePoints[indexer2.ind(i, 0)].x - nativePoints[indexer2.ind(i - 2, 0)].x, nativePoints[indexer2.ind(i, 0)].y - nativePoints[indexer2.ind(i - 2, 0)].y).normalized();
					nativePoints[indexer2.ind(i, 2)] = new float2(nativePoints[indexer2.ind(i, 2)].x + @float.x * 0.2f, nativePoints[indexer2.ind(i, 2)].y + @float.y * 0.2f);
					nativePoints[indexer2.ind(i - 2, 2)] = new float2(nativePoints[indexer2.ind(i - 2, 2)].x - @float.x * 0.2f, nativePoints[indexer2.ind(i - 2, 2)].y - @float.y * 0.2f);
				}
			}
			int2 @int = Room.StaticGetTilePosition(nativePoints[indexer2.ind(i, 0)]);
			int num2 = int.MaxValue;
			if (owner.OwnerRoom.aimap.height != -1 && @int.x >= 0 && @int.y >= 0 && @int.x < owner.OwnerRoom.aimap.width && @int.y < owner.OwnerRoom.aimap.height)
			{
				num2 = owner.OwnerRoom.aimap.terrainProximity[ExtraExtentions.ind(@int.x, @int.y, owner.OwnerRoom.aimap.height)];
			}
			if (moveAwayFromWalls && num2 < 4)
			{
				float2 f2 = new float2(0f, 0f);
				for (int j = 0; j < 4; j++)
				{
					int num3 = 0;
					for (int k = 0; k < 4; k++)
					{
						int2 int2 = @int + _jobDataStep1.naFourDirections[j] + _jobDataStep1.naFourDirections[k];
						if (int2.x >= 0 && int2.y >= 0 && int2.x < owner.OwnerRoom.aimap.width && int2.y < owner.OwnerRoom.aimap.height)
						{
							num3 += owner.OwnerRoom.aimap.terrainProximity[ExtraExtentions.ind(int2.x, int2.y, owner.OwnerRoom.aimap.height)];
						}
					}
					f2 = new float2(f2.x + (float)(_jobDataStep1.naFourDirections[j].x * num3), f2.y + (float)(_jobDataStep1.naFourDirections[j].y * num3));
				}
				float num4 = Custom.LerpMap(num2, 0f, 3f, 2f, 0.2f);
				float2 float3 = f2.normalized();
				nativePoints[indexer2.ind(i, 2)] = new float2(nativePoints[indexer2.ind(i, 2)].x + float3.x * num4, nativePoints[indexer2.ind(i, 2)].y + float3.y * num4);
			}
			_jobDataStep1.outPoints[indexer2.ind(i, 1)] = new Vector2(nativePoints[indexer2.ind(i, 1)].x, nativePoints[indexer2.ind(i, 1)].y);
			if (Hint.Likely(i > 1))
			{
				_jobDataStep1.outPoints[indexer2.ind(i - 2, 0)] = new Vector2(nativePoints[indexer2.ind(i - 2, 0)].x, nativePoints[indexer2.ind(i - 2, 0)].y);
				_jobDataStep1.outPoints[indexer2.ind(i - 2, 2)] = new Vector2(nativePoints[indexer2.ind(i - 2, 2)].x, nativePoints[indexer2.ind(i - 2, 2)].y);
			}
		}
		for (int l = Math.Max(0, pointsDim0Length - 3); l < pointsDim0Length; l++)
		{
			_jobDataStep1.outPoints[indexer2.ind(l, 0)] = new Vector2(nativePoints[indexer2.ind(l, 0)].x, nativePoints[indexer2.ind(l, 0)].y);
			_jobDataStep1.outPoints[indexer2.ind(l, 2)] = new Vector2(nativePoints[indexer2.ind(l, 2)].x, nativePoints[indexer2.ind(l, 2)].y);
		}
	}

	public void InitiateSprites(int spr, RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
	{
		sLeaser.sprites[spr] = TriangleMesh.MakeLongMesh(points.GetLength(0), pointyTip: false, customColor: true);
		UpdateColor(color, 0f, spr, sLeaser);
	}

	public void DrawSprites(int spr, RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
	{
		sLeaser.sprites[spr].isVisible = !culled;
		if (!culled)
		{
			Vector2 vector = Vector2.Lerp(points[0, 1], points[0, 0], timeStacker);
			if (owner != null)
			{
				vector = owner.ConnectionPos(index, timeStacker);
			}
			float num = 0.5f;
			for (int i = 0; i < points.GetLength(0); i++)
			{
				Vector2 vector2 = Vector2.Lerp(points[i, 1], points[i, 0], timeStacker);
				Vector2 normalized = (vector - vector2).normalized;
				Vector2 vector3 = Custom.PerpendicularVector(normalized);
				float num2 = Vector2.Distance(vector, vector2) / 5f;
				(sLeaser.sprites[spr] as TriangleMesh).MoveVertice(i * 4, vector - normalized * num2 - vector3 * num - camPos);
				(sLeaser.sprites[spr] as TriangleMesh).MoveVertice(i * 4 + 1, vector - normalized * num2 + vector3 * num - camPos);
				(sLeaser.sprites[spr] as TriangleMesh).MoveVertice(i * 4 + 2, vector2 + normalized * num2 - vector3 * num - camPos);
				(sLeaser.sprites[spr] as TriangleMesh).MoveVertice(i * 4 + 3, vector2 + normalized * num2 + vector3 * num - camPos);
				vector = vector2;
			}
		}
	}

	public void UpdateColor(Color newColor, float gradientStart, int spr, RoomCamera.SpriteLeaser sLeaser)
	{
		color = newColor;
		for (int i = 0; i < (sLeaser.sprites[spr] as TriangleMesh).verticeColors.Length; i++)
		{
			float value = (float)i / (float)((sLeaser.sprites[spr] as TriangleMesh).verticeColors.Length - 1);
			(sLeaser.sprites[spr] as TriangleMesh).verticeColors[i] = Color.Lerp(color, Custom.HSL2RGB(22f / 45f, 0.5f, 0.2f), Mathf.InverseLerp(gradientStart, 1f, value));
		}
		for (int j = 1; j < 3; j++)
		{
			(sLeaser.sprites[spr] as TriangleMesh).verticeColors[(sLeaser.sprites[spr] as TriangleMesh).verticeColors.Length - j] = new Color(0f, 0f, 1f);
		}
	}
}
