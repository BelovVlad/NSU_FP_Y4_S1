using System;
using System.Globalization;
using RWCustom;
using UnityEngine;

public class OverseerCarcass : PlayerCarryableItem, IDrawable
{
	public class AbstractOverseerCarcass : AbstractPhysicalObject
	{
		public Color color;

		public int ownerIterator;

		public bool InspectorMode;

		public AbstractOverseerCarcass(World world, PhysicalObject realizedObject, WorldCoordinate pos, EntityID ID, Color color, int ownerIterator)
			: base(world, AbstractObjectType.OverseerCarcass, realizedObject, pos, ID)
		{
			this.color = color;
			this.ownerIterator = ownerIterator;
		}

		public override string ToString()
		{
			string text = string.Format(CultureInfo.InvariantCulture, "{0}<oA>{1}<oA>{2}<oA>{3}<oA>{4}<oA>{5}<oA>{6}", base.IDAndRippleLayerString, type.ToString(), pos.SaveToString(), color.r, color.g, color.b, ownerIterator);
			if (ModManager.DLCShared)
			{
				text += string.Format(CultureInfo.InvariantCulture, "<oA>{0}", InspectorMode ? "1" : "0");
			}
			text = SaveState.SetCustomData(this, text);
			return SaveUtils.AppendUnrecognizedStringAttrs(text, "<oA>", unrecognizedAttributes);
		}
	}

	public bool lastGrabbed;

	public float rotation;

	public float lastRotation;

	public float rotSpeed;

	private bool bump;

	public Vector2[,,] cords;

	public float sparkling;

	public float sin;

	public float lastSin;

	private SharedPhysics.TerrainCollisionData scratchTerrainCollisionData;

	private Color blackCol;

	private AbstractOverseerCarcass AbstrCarcass => abstractPhysicalObject as AbstractOverseerCarcass;

	public override float ThrowPowerFactor => 0.5f;

	public OverseerCarcass(AbstractPhysicalObject abstractPhysicalObject, World world)
		: base(abstractPhysicalObject)
	{
		base.bodyChunks = new BodyChunk[1];
		base.bodyChunks[0] = new BodyChunk(this, 0, new Vector2(0f, 0f), 5f, 0.07f);
		bodyChunkConnections = new BodyChunkConnection[0];
		base.airFriction = 0.999f;
		base.gravity = 0.9f;
		bounce = 0.4f;
		surfaceFriction = 0.9f;
		collisionLayer = 2;
		base.waterFriction = 0.98f;
		base.buoyancy = 0.4f;
		rotation = UnityEngine.Random.value * 360f;
		lastRotation = rotation;
		cords = new Vector2[2, 5, 4];
		for (int i = 0; i < cords.GetLength(0); i++)
		{
			for (int j = 0; j < cords.GetLength(1); j++)
			{
				cords[i, j, 3] = Custom.RNV() * UnityEngine.Random.value;
			}
		}
	}

	public override void NewRoom(Room newRoom)
	{
		base.NewRoom(newRoom);
		Reset();
	}

	public override void PlaceInRoom(Room placeRoom)
	{
		base.PlaceInRoom(placeRoom);
		base.firstChunk.HardSetPosition(placeRoom.MiddleOfTile(abstractPhysicalObject.pos));
		Reset();
	}

	public void Reset()
	{
		for (int i = 0; i < cords.GetLength(0); i++)
		{
			for (int j = 0; j < cords.GetLength(1); j++)
			{
				cords[i, j, 0] = base.firstChunk.pos + new Vector2(0f, 5f * (float)i);
				cords[i, j, 1] = cords[i, j, 0];
				cords[i, j, 2] *= 0f;
			}
		}
	}

	public override void Update(bool eu)
	{
		base.Update(eu);
		lastSin = sin;
		sin += (1f + sparkling) / 75f;
		lastRotation = rotation;
		rotation += rotSpeed;
		if (sparkling > 0.3f)
		{
			sparkling = Mathf.Max(0f, sparkling - 0.005f);
		}
		else
		{
			sparkling = Mathf.Max(0f, sparkling - 0.00033333333f);
		}
		if (UnityEngine.Random.value < sparkling)
		{
			rotSpeed += Mathf.Lerp(-35f, 35f, UnityEngine.Random.value) * sparkling;
		}
		if (UnityEngine.Random.value < Mathf.Pow(sparkling, 3f))
		{
			room.AddObject(new Spark(base.firstChunk.pos, Custom.RNV() * (UnityEngine.Random.value * Mathf.Lerp(11f, 27f, sparkling)), AbstrCarcass.color, null, 12, 60));
		}
		if (UnityEngine.Random.value < sparkling)
		{
			cords[UnityEngine.Random.Range(0, cords.GetLength(0)), UnityEngine.Random.Range(0, cords.GetLength(1)), 2] += Custom.RNV() * (UnityEngine.Random.value * 17f * sparkling);
		}
		if (base.firstChunk.ContactPoint.y < 0)
		{
			if (UnityEngine.Random.value < sparkling)
			{
				base.firstChunk.vel += Custom.DegToVec(-45f + UnityEngine.Random.value * 90f) * (UnityEngine.Random.value * Mathf.Pow(7f, 0.5f) * sparkling);
			}
			if (Mathf.Abs(base.firstChunk.pos.x - base.firstChunk.lastPos.x) > 1f)
			{
				rotSpeed = Mathf.Lerp(rotSpeed, (base.firstChunk.pos.x - base.firstChunk.lastPos.x) * 18f, 0.45f);
			}
			else
			{
				rotSpeed *= 0.8f;
			}
			if (Mathf.Abs(rotSpeed) > 6f)
			{
				base.firstChunk.vel.x *= 0.95f;
				base.firstChunk.vel.x += rotSpeed / Custom.LerpMap(Mathf.Abs(base.firstChunk.vel.x), 0f, 14f, 30f, 5000f);
				if (Custom.DegToVec(rotation).y > 0.9f)
				{
					if (bump)
					{
						base.firstChunk.pos.y += 3f;
						base.firstChunk.vel.y += Mathf.Abs(base.firstChunk.vel.x) / 10f;
						base.firstChunk.vel.x *= 0.8f;
						rotSpeed /= 2f;
						bump = false;
					}
				}
				else
				{
					bump = true;
				}
			}
			else
			{
				base.firstChunk.vel.x *= 0.5f;
			}
		}
		if (grabbedBy.Count > 0)
		{
			rotation = Custom.AimFromOneVectorToAnother(base.firstChunk.pos, grabbedBy[0].grabber.firstChunk.pos) + 90f * ((grabbedBy[0].graspUsed == 0) ? (-1f) : 1f);
			rotSpeed = 0f;
			if (!lastGrabbed)
			{
				lastRotation = rotation;
			}
		}
		else if (lastGrabbed)
		{
			rotSpeed = Mathf.Lerp(-35f, 35f, UnityEngine.Random.value);
		}
		lastGrabbed = grabbedBy.Count > 0;
		base.firstChunk.collideWithObjects = !lastGrabbed;
		base.firstChunk.collideWithTerrain = !lastGrabbed;
		base.firstChunk.goThroughFloors = lastGrabbed;
		Vector2 vector = -Custom.DegToVec(rotation);
		for (int i = 0; i < cords.GetLength(0); i++)
		{
			for (int j = 0; j < cords.GetLength(1); j++)
			{
				float num = (float)j / (float)(cords.GetLength(1) - 1);
				cords[i, j, 1] = cords[i, j, 0];
				cords[i, j, 0] += cords[i, j, 2];
				cords[i, j, 2] *= Mathf.Lerp(1f, 0.85f, num);
				cords[i, j, 2] += vector * ((3f + Mathf.Abs(rotSpeed) / 5f) * Mathf.Pow(1f - num, 3f));
				if (j > 1 && room.GetTile(cords[i, j, 0]).Solid)
				{
					SharedPhysics.TerrainCollisionData cd = scratchTerrainCollisionData.Set(cords[i, j, 0], cords[i, j, 1], cords[i, j, 2], 1f, new IntVector2(0, 0), lastGrabbed);
					cd = SharedPhysics.VerticalCollision(room, cd);
					cd = SharedPhysics.HorizontalCollision(room, cd);
					cords[i, j, 0] = cd.pos;
					cords[i, j, 2] = cd.vel;
				}
				if (room.PointSubmerged(cords[i, j, 0]))
				{
					cords[i, j, 2] *= 0.8f;
					cords[i, j, 2].y += 0.3f * num;
				}
				else
				{
					cords[i, j, 2].y -= 0.9f * room.gravity * num;
				}
				cords[i, j, 2] += Custom.RotateAroundOrigo(cords[i, j, 3], rotation);
				ConnectSegment(i, j);
			}
			for (int num2 = cords.GetLength(0) - 1; num2 >= 0; num2--)
			{
				ConnectSegment(i, num2);
			}
		}
	}

	public override void TerrainImpact(int chunk, IntVector2 direction, float speed, bool firstContact)
	{
		base.TerrainImpact(chunk, direction, speed, firstContact);
		if (firstContact && speed > 3f)
		{
			sin += Mathf.Lerp(-1f, 1f, UnityEngine.Random.value);
			if (UnityEngine.Random.value < 1f / 6f)
			{
				sparkling = Mathf.Max(sparkling, UnityEngine.Random.value * 0.5f);
			}
			if (UnityEngine.Random.value < Custom.LerpMap(speed, 3f, 17f, 0.2f, 0.8f))
			{
				room.AddObject(new Spark(base.firstChunk.pos, Custom.RNV() * (UnityEngine.Random.value * Mathf.Lerp(11f, 27f, sparkling)), AbstrCarcass.color, null, 12, 60));
			}
		}
	}

	private void ConnectSegment(int c, int i)
	{
		if (i == 0)
		{
			Vector2 vector = base.firstChunk.pos - Custom.DegToVec(rotation) * 8f;
			Vector2 vector2 = Custom.DirVec(cords[c, i, 0], vector);
			float num = Vector2.Distance(cords[c, i, 0], vector);
			cords[c, i, 0] -= vector2 * (1.5f - num);
			cords[c, i, 2] -= vector2 * (1.5f - num);
		}
		else
		{
			Vector2 vector3 = Custom.DirVec(cords[c, i, 0], cords[c, i - 1, 0]);
			float num2 = Vector2.Distance(cords[c, i, 0], cords[c, i - 1, 0]);
			Vector2 vector4 = vector3 * ((1.5f - num2) * 0.5f);
			cords[c, i, 0] -= vector4;
			cords[c, i, 2] -= vector4;
			cords[c, i - 1, 0] += vector4;
			cords[c, i - 1, 2] += vector4;
		}
	}

	public void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
	{
		sLeaser.sprites = new FSprite[6];
		sLeaser.sprites[0] = new FSprite("mouseEyeA1");
		if (ModManager.DLCShared && (abstractPhysicalObject as AbstractOverseerCarcass).InspectorMode)
		{
			sLeaser.sprites[0].scaleX = 2.15f;
			sLeaser.sprites[0].scaleY = 2.15f;
		}
		else
		{
			sLeaser.sprites[0].scaleX = 1.15f;
			sLeaser.sprites[0].scaleY = 1.15f;
		}
		sLeaser.sprites[1] = new FSprite("pixel");
		sLeaser.sprites[1].scaleX = 2f;
		sLeaser.sprites[1].scaleY = 8f;
		for (int i = 0; i < cords.GetLength(0); i++)
		{
			sLeaser.sprites[2 + i] = TriangleMesh.MakeLongMesh(cords.GetLength(1), pointyTip: false, customColor: false);
		}
		sLeaser.sprites[4] = new FSprite("mouseEyeB1");
		if (ModManager.DLCShared && (abstractPhysicalObject as AbstractOverseerCarcass).InspectorMode)
		{
			sLeaser.sprites[4].scaleY = 1.65f;
			sLeaser.sprites[4].scaleX = 1.54f;
		}
		else
		{
			sLeaser.sprites[4].scaleY = 0.75f;
			sLeaser.sprites[4].scaleX = 0.9f;
		}
		sLeaser.sprites[5] = new FSprite("pixel");
		AddToContainer(sLeaser, rCam, null);
	}

	public void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
	{
		Vector2 vector = Vector2.Lerp(base.firstChunk.lastPos, base.firstChunk.pos, timeStacker);
		Vector2 vector2 = Custom.DegToVec(Mathf.Lerp(lastRotation, rotation, timeStacker));
		Vector3 vector3 = vector + vector2 * 3f;
		sLeaser.sprites[0].x = vector.x - camPos.x;
		sLeaser.sprites[0].y = vector.y - camPos.y;
		sLeaser.sprites[1].x = vector.x - vector2.x * 4f - camPos.x;
		sLeaser.sprites[1].y = vector.y - vector2.y * 4f - camPos.y;
		sLeaser.sprites[4].x = vector3.x - camPos.x;
		sLeaser.sprites[4].y = vector3.y - camPos.y;
		sLeaser.sprites[5].x = vector3.x - camPos.x;
		sLeaser.sprites[5].y = vector3.y - camPos.y;
		sLeaser.sprites[0].rotation = Custom.VecToDeg(vector2);
		sLeaser.sprites[1].rotation = Custom.VecToDeg(vector2);
		sLeaser.sprites[4].rotation = Custom.VecToDeg(vector2);
		sLeaser.sprites[0].color = blackCol;
		sLeaser.sprites[1].color = blackCol;
		float num = Mathf.Lerp(Mathf.Lerp(Mathf.Pow(UnityEngine.Random.value, 2f) * 0.2f, UnityEngine.Random.value, sparkling), 0.4f + 0.6f * sparkling, 0.5f + 0.5f * Mathf.Sin(Mathf.Lerp(lastSin, sin, timeStacker) * (float)Math.PI * 2f));
		sLeaser.sprites[4].color = Color.Lerp(blackCol, AbstrCarcass.color, num);
		if (num > 0.5f)
		{
			sLeaser.sprites[5].color = Color.Lerp(AbstrCarcass.color, Color.white, Mathf.InverseLerp(0.5f, 1f, num));
		}
		else
		{
			sLeaser.sprites[5].color = Color.Lerp(blackCol, AbstrCarcass.color, Mathf.InverseLerp(0f, 0.5f, num));
		}
		for (int i = 0; i < cords.GetLength(0); i++)
		{
			Vector2 vector4 = vector - vector2 * 4f;
			for (int j = 0; j < cords.GetLength(1); j++)
			{
				Vector2 vector5 = Vector2.Lerp(cords[i, j, 1], cords[i, j, 0], timeStacker);
				Vector2 normalized = (vector5 - vector4).normalized;
				Vector2 vector6 = Custom.PerpendicularVector(normalized);
				float num2 = Vector2.Distance(vector5, vector4) / 5f;
				if (j == 0)
				{
					(sLeaser.sprites[2 + i] as TriangleMesh).MoveVertice(j * 4, vector4 - vector6 * 0.5f - camPos);
					(sLeaser.sprites[2 + i] as TriangleMesh).MoveVertice(j * 4 + 1, vector4 + vector6 * 0.5f - camPos);
				}
				else
				{
					(sLeaser.sprites[2 + i] as TriangleMesh).MoveVertice(j * 4, vector4 - vector6 * 0.5f + normalized * num2 - camPos);
					(sLeaser.sprites[2 + i] as TriangleMesh).MoveVertice(j * 4 + 1, vector4 + vector6 * 0.5f + normalized * num2 - camPos);
				}
				(sLeaser.sprites[2 + i] as TriangleMesh).MoveVertice(j * 4 + 2, vector5 - vector6 * 0.5f - normalized * num2 - camPos);
				(sLeaser.sprites[2 + i] as TriangleMesh).MoveVertice(j * 4 + 3, vector5 + vector6 * 0.5f - normalized * num2 - camPos);
				vector4 = vector5;
			}
		}
		if (base.slatedForDeletetion || room != rCam.room)
		{
			sLeaser.CleanSpritesAndRemove();
		}
	}

	public void ApplyPalette(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, RoomPalette palette)
	{
		blackCol = palette.blackColor;
		for (int i = 0; i < cords.GetLength(0); i++)
		{
			sLeaser.sprites[2 + i].color = blackCol;
		}
	}

	public void AddToContainer(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, FContainer newContatiner)
	{
		if (newContatiner == null)
		{
			newContatiner = rCam.ReturnFContainer("Items");
		}
		for (int i = 0; i < sLeaser.sprites.Length; i++)
		{
			sLeaser.sprites[i].RemoveFromContainer();
			newContatiner.AddChild(sLeaser.sprites[i]);
		}
	}
}
