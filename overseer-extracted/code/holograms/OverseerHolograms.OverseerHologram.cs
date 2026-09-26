using System;
using System.Collections.Generic;
using MoreSlugcats;
using RWCustom;
using UnityEngine;

namespace OverseerHolograms;

public abstract class OverseerHologram : UpdatableAndDeletable, IDrawable
{
	public class Message : ExtEnum<Message>
	{
		public static readonly Message None = new Message("None", register: true);

		public static readonly Message Bats = new Message("Bats", register: true);

		public static readonly Message DangerousCreature = new Message("DangerousCreature", register: true);

		public static readonly Message FoodObject = new Message("FoodObject", register: true);

		public static readonly Message Shelter = new Message("Shelter", register: true);

		public static readonly Message ProgressionDirection = new Message("ProgressionDirection", register: true);

		public static readonly Message GateScene = new Message("GateScene", register: true);

		public static readonly Message InWorldSuperJump = new Message("InWorldSuperJump", register: true);

		public static readonly Message PickupObject = new Message("PickupObject", register: true);

		public static readonly Message ScavengerTrade = new Message("ScavengerTrade", register: true);

		public static readonly Message Angry = new Message("Angry", register: true);

		public static readonly Message ForcedDirection = new Message("ForcedDirection", register: true);

		public static readonly Message TutorialFood = new Message("TutorialFood", register: true);

		public static readonly Message GetUpOnFirstBox = new Message("GetUpOnFirstBox", register: true);

		public static readonly Message ClimbPole = new Message("ClimbPole", register: true);

		public static readonly Message EatInstruction = new Message("EatInstruction", register: true);

		public static readonly Message SuperJump = new Message("SuperJump", register: true);

		public Message(string value, bool register = false)
			: base(value, register)
		{
		}
	}

	public abstract class HologramPart
	{
		public class Line
		{
			public Vector3 A;

			public Vector3 B;

			public Vector3 A2;

			public Vector3 B2;

			public int sprite;

			public Line(Vector3 A, Vector3 B, int sprite)
			{
				this.A = A;
				this.B = B;
				A2 = A;
				B2 = B;
				this.sprite = sprite;
			}
		}

		public OverseerHologram hologram;

		public int totalSprites;

		public int firstSprite;

		public List<Line> lines;

		public Vector3 rotation;

		public Vector3 lastRotation;

		public Vector2 offset;

		public Vector2 lastOffset;

		public float transform;

		public float lastTransform;

		public float partFade;

		public float lastPartFade;

		public bool visible = true;

		public float fadeExponent = 1f;

		public bool allSpritesHologramShader = true;

		public Color color;

		public Color lastColor;

		protected virtual Color GetToColor => hologram.color;

		public HologramPart(OverseerHologram hologram, int firstSprite)
		{
			this.hologram = hologram;
			this.firstSprite = firstSprite;
			lines = new List<Line>();
			partFade = 1f;
			lastPartFade = 1f;
		}

		public void AddClosedPolygon(List<Vector2> vL)
		{
			for (int i = 1; i < vL.Count; i++)
			{
				AddLine(vL[i - 1], vL[i]);
			}
			AddLine(vL[vL.Count - 1], vL[0]);
		}

		public void AddClosed3DPolygon(List<Vector2> vL, float depth)
		{
			for (int i = 1; i < vL.Count; i++)
			{
				Add3DLine(vL[i - 1], vL[i], depth);
			}
			Add3DLine(vL[vL.Count - 1], vL[0], depth);
		}

		public void Add3DLine(Vector2 A, Vector2 B, float depth)
		{
			AddLine(new Vector3(A.x, A.y, 0f - depth), new Vector3(B.x, B.y, 0f - depth));
			AddLine(new Vector3(A.x, A.y, depth), new Vector3(B.x, B.y, depth));
			AddLine(new Vector3(A.x, A.y, 0f - depth), new Vector3(A.x, A.y, depth));
		}

		public void AddDoubleLine(Vector2 A, Vector2 B, float depth)
		{
			AddLine(new Vector3(A.x, A.y, 0f - depth), new Vector3(B.x, B.y, 0f - depth));
			AddLine(new Vector3(A.x, A.y, depth), new Vector3(B.x, B.y, depth));
		}

		public void AddLine(Vector2 A, Vector2 B)
		{
			AddLine(new Vector3(A.x, A.y, 0f), new Vector3(B.x, B.y, 0f));
		}

		public void AddLine(Vector3 A, Vector3 B)
		{
			lines.Add(new Line(A, B, firstSprite + totalSprites));
			totalSprites++;
		}

		public virtual void Update()
		{
			lastRotation = rotation;
			lastOffset = offset;
			lastTransform = transform;
			lastPartFade = partFade;
			partFade = Custom.LerpAndTick(partFade, visible ? 1f : 0f, 0.01f, 0.05f);
			if ((partFade * hologram.fade == 0f || partFade * hologram.fade == 1f) && partFade * hologram.fade != lastPartFade * hologram.lastFade)
			{
				fadeExponent = Mathf.Lerp(0.5f, 1.5f, UnityEngine.Random.value);
			}
			lastColor = color;
			color = Color.Lerp(color, GetToColor, 0.5f);
		}

		public virtual void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
		{
			for (int i = 0; i < lines.Count; i++)
			{
				sLeaser.sprites[lines[i].sprite] = new FSprite("pixel");
				sLeaser.sprites[lines[i].sprite].anchorY = 0f;
			}
		}

		public virtual void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos, Vector2 partPos, Vector2 headPos, float useFade, float popOut, Color useColor)
		{
		}

		public virtual void ApplyPalette(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, RoomPalette palette)
		{
		}
	}

	public class Arrow : HologramPart
	{
		public Vector2 dir;

		public Arrow(OverseerHologram hologram, int firstSprite)
			: base(hologram, firstSprite)
		{
			AddClosed3DPolygon(new List<Vector2>
			{
				new Vector2(-3.5f, 20f),
				new Vector2(0f, 27f),
				new Vector2(3.5f, 20f)
			}, 3f);
		}

		public override void Update()
		{
			base.Update();
			rotation.z = Custom.VecToDeg(new Vector2(0f - dir.x, dir.y));
		}
	}

	public class Pentagon : HologramPart
	{
		public Pentagon(OverseerHologram hologram, int firstSprite)
			: base(hologram, firstSprite)
		{
			float num = 15f;
			for (int i = 0; i < 5; i++)
			{
				float num2 = (float)i / 5f;
				float num3 = (float)(i + 1) / 5f;
				Add3DLine(Custom.DegToVec(num2 * 360f) * num, Custom.DegToVec(num3 * 360f) * num, 5f);
			}
		}

		public override void Update()
		{
			base.Update();
		}
	}

	public class Symbol : HologramPart
	{
		public string elementName;

		public float anchorY = 0.5f;

		public float scaleX = 1f;

		public Symbol(OverseerHologram hologram, int firstSprite, string elementName)
			: base(hologram, firstSprite)
		{
			this.elementName = elementName;
			totalSprites = 1;
		}

		public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
		{
			base.InitiateSprites(sLeaser, rCam);
			sLeaser.sprites[firstSprite] = new FSprite(elementName);
		}

		public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos, Vector2 partPos, Vector2 headPos, float useFade, float popOut, Color useColor)
		{
			base.DrawSprites(sLeaser, rCam, timeStacker, camPos, partPos, headPos, useFade, popOut, useColor);
			if (UnityEngine.Random.value > Mathf.InverseLerp(0.5f, 1f, useFade))
			{
				sLeaser.sprites[firstSprite].isVisible = false;
				return;
			}
			sLeaser.sprites[firstSprite].isVisible = true;
			partPos = Vector3.Lerp(headPos, partPos, popOut);
			sLeaser.sprites[firstSprite].x = partPos.x - camPos.x;
			sLeaser.sprites[firstSprite].y = partPos.y - camPos.y;
			sLeaser.sprites[firstSprite].color = useColor;
			if (UnityEngine.Random.value > useFade)
			{
				sLeaser.sprites[firstSprite].element = Futile.atlasManager.GetElementWithName("pixel");
				sLeaser.sprites[firstSprite].anchorY = 0f;
				sLeaser.sprites[firstSprite].rotation = Custom.AimFromOneVectorToAnother(partPos, headPos);
				sLeaser.sprites[firstSprite].scaleY = Vector2.Distance(partPos, headPos);
				sLeaser.sprites[firstSprite].scaleX = 1f;
			}
			else
			{
				sLeaser.sprites[firstSprite].element = Futile.atlasManager.GetElementWithName(elementName);
				sLeaser.sprites[firstSprite].rotation = 0f;
				sLeaser.sprites[firstSprite].scaleY = 1f;
				sLeaser.sprites[firstSprite].scaleX = scaleX * Mathf.InverseLerp(0.5f, 1f, useFade);
				sLeaser.sprites[firstSprite].anchorY = anchorY;
			}
		}
	}

	public class CyclingSymbol : Symbol
	{
		public int currEl;

		public List<string> elementNames;

		public int cntr;

		public int cycleLength;

		public CyclingSymbol(OverseerHologram hologram, int firstSprite, List<string> elementNames, int cycleLength)
			: base(hologram, firstSprite, elementNames[0])
		{
			this.elementNames = elementNames;
			this.cycleLength = cycleLength;
		}

		public override void Update()
		{
			base.Update();
			cntr++;
			if (cntr > cycleLength)
			{
				cntr = 0;
				currEl++;
				if (currEl >= elementNames.Count)
				{
					currEl = 0;
				}
				elementName = elementNames[currEl];
			}
		}
	}

	public class HologramLightEffect : HologramPart
	{
		private float darkDownAlpha;

		private float darkDownRad;

		private float lightAlpha;

		private float lightRad;

		public int darkSprite = -1;

		public int lightSprite = -1;

		public HologramLightEffect(OverseerHologram hologram, int firstSprite, float lightAlpha, float darkDownAlpha, float lightRad, float darkDownRad)
			: base(hologram, firstSprite)
		{
			this.darkDownAlpha = darkDownAlpha;
			this.lightAlpha = lightAlpha;
			this.darkDownRad = darkDownRad;
			this.lightRad = lightRad;
			allSpritesHologramShader = false;
			totalSprites = 0;
			if (darkDownAlpha > 0f)
			{
				darkSprite = totalSprites;
				totalSprites++;
			}
			if (lightAlpha > 0f)
			{
				lightSprite = totalSprites;
				totalSprites++;
			}
			totalSprites = ((darkSprite > -1) ? 1 : 0) + ((lightSprite > -1) ? 1 : 0);
		}

		public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
		{
			base.InitiateSprites(sLeaser, rCam);
			for (int i = 0; i < totalSprites; i++)
			{
				sLeaser.sprites[firstSprite + i] = new FSprite("Futile_White");
				if (i == darkSprite)
				{
					sLeaser.sprites[firstSprite + i].shader = rCam.game.rainWorld.Shaders["FlatLight"];
					sLeaser.sprites[firstSprite + i].color = new Color(0f, 0f, 0f);
				}
				else if (i == lightSprite)
				{
					sLeaser.sprites[firstSprite + i].shader = rCam.game.rainWorld.Shaders["LightSource"];
				}
			}
		}

		public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos, Vector2 partPos, Vector2 headPos, float useFade, float popOut, Color useColor)
		{
			base.DrawSprites(sLeaser, rCam, timeStacker, camPos, partPos, headPos, useFade, popOut, useColor);
			for (int i = 0; i < totalSprites; i++)
			{
				if (UnityEngine.Random.value > Mathf.InverseLerp(0f, 0.5f, useFade))
				{
					sLeaser.sprites[firstSprite + i].isVisible = false;
					break;
				}
				sLeaser.sprites[firstSprite + i].isVisible = true;
				partPos = Vector3.Lerp(headPos, partPos, popOut);
				sLeaser.sprites[firstSprite + i].x = partPos.x - camPos.x;
				sLeaser.sprites[firstSprite + i].y = partPos.y - camPos.y;
				if (i == lightSprite)
				{
					sLeaser.sprites[firstSprite + i].color = useColor;
					sLeaser.sprites[firstSprite + i].alpha = lightAlpha * Mathf.Pow(useFade, 3f);
					sLeaser.sprites[firstSprite + i].scale = lightRad / 8f * (0.5f + 0.5f * useFade);
				}
				else if (i == darkSprite)
				{
					sLeaser.sprites[firstSprite + i].alpha = darkDownAlpha * Mathf.Pow(useFade, 3f);
					sLeaser.sprites[firstSprite + i].scale = darkDownRad / 8f * (0.5f + 0.5f * useFade);
				}
			}
		}
	}

	public class PlayerGhost : Symbol
	{
		public Vector2? roomPosition;

		public PlayerGhost(OverseerHologram hologram, int firstSprite, string elementName, Vector2? roomPosition)
			: base(hologram, firstSprite, elementName)
		{
			this.roomPosition = roomPosition;
			anchorY = 0f;
		}

		public override void Update()
		{
			base.Update();
			if (roomPosition.HasValue)
			{
				offset = (roomPosition.Value - hologram.pos) * (0.2f + 0.8f * Mathf.Pow(hologram.fade * partFade, 0.8f));
			}
		}
	}

	public class PointingHologram : OverseerHologram
	{
		public bool wantVisalContactFromPlayer;

		public Arrow arrow;

		public Symbol symbol;

		public HologramLightEffect lightEffect;

		public override Vector2 lookAt
		{
			get
			{
				if (fade > 0f && fade < 1f)
				{
					return pos;
				}
				if (communicateWith == null || !lookAtCommunicationCreature)
				{
					return PointAt;
				}
				return communicateWith.DangerPos;
			}
		}

		public virtual Vector2 PointAt => default(Vector2);

		public PointingHologram(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			arrow = new Arrow(this, totalSprites);
			AddPart(arrow);
			lightEffect = new HologramLightEffect(this, totalSprites, 0.6f, 0.2f, 40f, 80f);
			AddPart(lightEffect);
		}

		public PointingHologram(AncientBot robo, Message message, Creature communicateWith, float importance)
			: base(robo, message, communicateWith, importance)
		{
			arrow = new Arrow(this, totalSprites);
			AddPart(arrow);
			lightEffect = new HologramLightEffect(this, totalSprites, 0.6f, 0.2f, 40f, 80f);
			AddPart(lightEffect);
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			arrow.dir = Vector3.Slerp(arrow.dir, Custom.DirVec(pos, PointAt), UnityEngine.Random.value * 0.3f);
			arrow.visible = symbol.visible;
		}

		public override float InfluenceHoverScoreOfTile(IntVector2 testPos, float f)
		{
			f += Vector2.Distance(room.MiddleOfTile(testPos), PointAt) * 0.1f;
			if (Vector2.Distance(room.MiddleOfTile(testPos), PointAt) > Vector2.Distance(communicateWith.DangerPos, PointAt))
			{
				return f + 2000f;
			}
			return f;
		}

		public override float DisplayPosScore(IntVector2 testPos)
		{
			float num = 0f;
			if (Custom.DistLess(PointAt, communicateWith.DangerPos, 150f))
			{
				num += 100f;
			}
			num = ((Custom.DistLess(PointAt, room.MiddleOfTile(testPos), Vector2.Distance(PointAt, communicateWith.DangerPos)) && Custom.DistLess(communicateWith.DangerPos, room.MiddleOfTile(testPos), Vector2.Distance(PointAt, communicateWith.DangerPos))) ? (num + Mathf.Min(500f, Mathf.Abs(Custom.DistanceToLine(room.MiddleOfTile(testPos), communicateWith.DangerPos, PointAt)))) : (num + 500f));
			if (Custom.DistLess(room.MiddleOfTile(testPos), PointAt, 100f))
			{
				num += 1000f;
			}
			if (communicateWith is Player && room.ViewedByAnyCamera(room.MiddleOfTile(testPos), -10f))
			{
				if (room.ViewedByAnyCamera(PointAt, -10f))
				{
					num += Mathf.Min(Mathf.Abs(100f - Vector2.Distance(room.MiddleOfTile(testPos), PointAt)), 1000f) * 0.5f;
				}
			}
			else
			{
				num += 10000f;
			}
			return num;
		}
	}

	public abstract class DoorPointer : PointingHologram
	{
		public class CreatureDoorDistanceTracker
		{
			public Room room;

			public Creature creature;

			public List<int>[] distances;

			public int closestTo = -1;

			public int distanceToClosest;

			public int movingTowards = -1;

			private int movingTowardsCounter;

			public CreatureDoorDistanceTracker(Room room, Creature creature)
			{
				this.room = room;
				this.creature = creature;
				distances = new List<int>[room.abstractRoom.connections.Length];
				for (int i = 0; i < distances.Length; i++)
				{
					distances[i] = new List<int>();
				}
			}

			public void Update()
			{
				IntVector2 tilePosition = room.GetTilePosition(creature.mainBodyChunk.pos);
				if (!room.aimap.TileAccessibleToCreature(tilePosition, StaticWorld.GetCreatureTemplate(CreatureTemplate.Type.Fly)))
				{
					for (int i = 0; i < 4; i++)
					{
						if (room.aimap.TileAccessibleToCreature(tilePosition + Custom.fourDirections[i], StaticWorld.GetCreatureTemplate(CreatureTemplate.Type.Fly)))
						{
							tilePosition += Custom.fourDirections[i];
							break;
						}
					}
				}
				if (!room.aimap.TileAccessibleToCreature(tilePosition, StaticWorld.GetCreatureTemplate(CreatureTemplate.Type.Fly)))
				{
					return;
				}
				distanceToClosest = int.MaxValue;
				int num = int.MinValue;
				int num2 = -1;
				for (int j = 0; j < room.abstractRoom.connections.Length; j++)
				{
					if (room.abstractRoom.connections[j] == -1)
					{
						continue;
					}
					int num3 = room.aimap.ExitDistanceForCreature(tilePosition, j, StaticWorld.GetCreatureTemplate(CreatureTemplate.Type.Fly));
					if (num3 > -1 && (distances[j].Count == 0 || distances[j][0] != num3))
					{
						distances[j].Insert(0, num3);
						if (distances[j].Count > 20)
						{
							distances[j].RemoveAt(distances[j].Count - 1);
						}
					}
					if (distances[j].Count > 0)
					{
						if (distances[j][0] < distanceToClosest)
						{
							distanceToClosest = distances[j][0];
							closestTo = j;
						}
						if (distances[j][distances[j].Count - 1] - distances[j][0] > num)
						{
							num = distances[j][distances[j].Count - 1] - distances[j][0];
							num2 = j;
						}
					}
				}
				if (num2 == movingTowards)
				{
					movingTowardsCounter = 0;
					return;
				}
				movingTowardsCounter++;
				if (movingTowardsCounter > 10)
				{
					movingTowards = num2;
					movingTowardsCounter = 0;
				}
			}
		}

		private Vector2 doorPos;

		private int d = -1;

		private bool reportPlayerExitEnterance = true;

		private CreatureDoorDistanceTracker doorDistTracker;

		public bool pointerNecessary = true;

		public int door
		{
			get
			{
				return d;
			}
			set
			{
				d = value;
				if (room != null && d > -1 && d < room.abstractRoom.connections.Length && room.shortCutsReady)
				{
					doorPos = room.MiddleOfTile(room.ShortcutLeadingToNode(door).StartTile);
				}
				else
				{
					stillRelevant = false;
				}
			}
		}

		public override Vector2 PointAt => doorPos;

		public DoorPointer(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			room = overseer.room;
			doorPos = overseer.mainBodyChunk.pos;
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			if (reportPlayerExitEnterance && communicateWith.enteringShortCut.HasValue && communicateWith.room != null)
			{
				int destNode = communicateWith.room.shortcutData(communicateWith.enteringShortCut.Value).destNode;
				if (destNode > -1 && destNode < communicateWith.room.abstractRoom.connections.Length)
				{
					Custom.Log($"player going into exit: {destNode}");
					reportPlayerExitEnterance = false;
					PlayerGoingIntoExit(destNode == door);
				}
			}
			if (d > -1 && stillRelevant)
			{
				if (overseer.AI.tutorialBehavior != null || overseer.forceShowHologram)
				{
					pointerNecessary = true;
				}
				else if (doorDistTracker != null)
				{
					doorDistTracker.Update();
					pointerNecessary = doorDistTracker.movingTowards != door && (doorDistTracker.closestTo != door || doorDistTracker.distanceToClosest > 40 || !room.ViewedByAnyCamera(PointAt, -10f));
				}
				else if (room.readyForAI)
				{
					doorDistTracker = new CreatureDoorDistanceTracker(room, communicateWith);
				}
			}
			else
			{
				pointerNecessary = false;
			}
			symbol.visible = pointerNecessary;
			lightEffect.visible = pointerNecessary;
		}

		public virtual void PlayerGoingIntoExit(bool followingInstruction)
		{
			if (followingInstruction)
			{
				overseer.AI.communication.PlayerIsFollowingADirection(message);
			}
			else
			{
				overseer.AI.communication.PlayerNOTfollowingADirection(message, pointerNecessary);
			}
		}

		public override float DisplayPosScore(IntVector2 testPos)
		{
			float num = base.DisplayPosScore(testPos);
			if (door > -1 && Custom.DistLess(room.MiddleOfTile(room.ShortcutLeadingToNode(door).StartTile), room.MiddleOfTile(testPos), 400f))
			{
				float val = Vector2.Dot(room.ShorcutEntranceHoleDirection(room.ShortcutLeadingToNode(door).StartTile).ToVector2().normalized, Custom.DirVec(room.MiddleOfTile(room.ShortcutLeadingToNode(door).StartTile), room.MiddleOfTile(testPos)));
				num -= Custom.LerpMap(val, -1f, 1f, 0f, 1000f, 4f) * Mathf.InverseLerp(400f, 200f, Vector2.Distance(room.MiddleOfTile(room.ShortcutLeadingToNode(door).StartTile), room.MiddleOfTile(testPos)));
			}
			return num;
		}
	}

	public class BatPointer : DoorPointer
	{
		public int lastRoom = -1;

		public int currentlyPointingAtSwarmRoom = -1;

		public BatPointer(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			symbol = new Symbol(this, totalSprites, "batSymbol");
			AddPart(symbol);
			Custom.Log("new bat hologram");
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			if (message == Message.TutorialFood)
			{
				if (room.abstractRoom.name == "SU_A41" && overseer.AI.tutorialBehavior.batsInBatRoom < 3)
				{
					base.door = 3;
					symbol.elementName = "foodSymbol";
				}
				else
				{
					base.door = 0;
					symbol.elementName = "batSymbol";
				}
			}
			else if (overseer.room == null || overseer.room.world.fliesWorldAI == null || overseer.room.world.fliesWorldAI.ActiveSwarmRoom(overseer.room.abstractRoom))
			{
				stillRelevant = false;
			}
			else
			{
				if (lastRoom == overseer.room.abstractRoom.index)
				{
					return;
				}
				int num = 1;
				if (communicateWith is Player)
				{
					num = (communicateWith as Player).slugcatStats.foodToHibernate - (communicateWith as Player).FoodInStomach;
				}
				lastRoom = overseer.room.abstractRoom.index;
				int num2 = -1;
				float num3 = float.MaxValue;
				int num4 = 0;
				for (int i = 0; i < overseer.room.world.swarmRooms.Length; i++)
				{
					if (!overseer.room.world.fliesWorldAI.ActiveSwarmRoom(overseer.room.world.GetSwarmRoom(i)) || (overseer.room.world.region.regionNumber == 5 && !(overseer.room.world.GetSwarmRoom(i).name != "SU_A42")))
					{
						continue;
					}
					int num5 = FliesInRoom(overseer.room.world.GetSwarmRoom(i));
					if (num5 <= 0)
					{
						continue;
					}
					int num6 = -1;
					float num7 = float.MaxValue;
					for (int j = 0; j < overseer.room.abstractRoom.connections.Length; j++)
					{
						if (overseer.room.abstractRoom.connections[j] > -1)
						{
							float swarmRoomDistance = overseer.room.world.fliesWorldAI.GetSwarmRoomDistance(new WorldCoordinate(overseer.room.abstractRoom.index, -1, -1, j), i);
							if (swarmRoomDistance > -1f && swarmRoomDistance < num7)
							{
								num6 = j;
								num7 = swarmRoomDistance;
							}
						}
					}
					if (num6 > -1)
					{
						num7 *= Mathf.Lerp(1f, Custom.LerpMap(num5, 1f, 5f, 10f, 1f), overseer.room.world.rainCycle.CycleStartUp);
						if ((overseer.room.game.session as StoryGameSession).saveState.regionStates[overseer.room.world.region.regionNumber].roomsVisited.Contains(overseer.room.world.GetSwarmRoom(i).name))
						{
							num7 /= 3f;
						}
						if (overseer.room.abstractRoom.connections[num6] == overseer.AI.communication.lastPlayerRoom || i == overseer.AI.communication.unWantedSwarmRoom || num5 < num)
						{
							num7 = num7 * 20f + 10000f;
						}
						if (num7 < num3)
						{
							num3 = num7;
							num2 = num6;
							num4 = i;
						}
					}
				}
				if (num2 > -1)
				{
					base.door = num2;
					currentlyPointingAtSwarmRoom = num4;
					return;
				}
				Custom.Log("can't find any swarm rooms from here");
				overseer.AI.communication.noBatDirectionFromRoom = room.abstractRoom.index;
				stillRelevant = false;
			}
		}

		private int FliesInRoom(AbstractRoom testRoom)
		{
			if (testRoom == null)
			{
				return 0;
			}
			if (testRoom.realizedRoom == null)
			{
				return testRoom.NumberOfQuantifiedCreatureInRoom(CreatureTemplate.Type.Fly);
			}
			int num = 0;
			for (int i = 0; i < testRoom.creatures.Count; i++)
			{
				if (testRoom.creatures[i].creatureTemplate.type == CreatureTemplate.Type.Fly)
				{
					num++;
				}
			}
			return num;
		}

		public override void PlayerGoingIntoExit(bool followingInstruction)
		{
			base.PlayerGoingIntoExit(followingInstruction);
			if (!followingInstruction)
			{
				Custom.Log("player didn't follow. Avoid swarmRoom:", currentlyPointingAtSwarmRoom.ToString());
				overseer.AI.communication.unWantedSwarmRoom = currentlyPointingAtSwarmRoom;
			}
		}
	}

	public class ShelterPointer : DoorPointer
	{
		public int FORCEPOINT = -1;

		public int lastRoom = -1;

		public bool showingAShelterDoor;

		public int currentlyShowingToShelter = -1;

		public ShelterPointer(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			symbol = new Symbol(this, totalSprites, "shelterSymbol");
			AddPart(symbol);
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			if (FORCEPOINT > -1)
			{
				base.door = FORCEPOINT;
			}
			else if (lastRoom != overseer.room.abstractRoom.index)
			{
				lastRoom = overseer.room.abstractRoom.index;
				int num = -1;
				float num2 = float.MaxValue;
				int num3 = 0;
				for (int i = 0; i < overseer.room.world.shelters.Length; i++)
				{
					int num4 = -1;
					float num5 = float.MaxValue;
					for (int j = 0; j < overseer.room.abstractRoom.connections.Length; j++)
					{
						if (overseer.room.abstractRoom.connections[j] > -1)
						{
							float num6 = (overseer.abstractCreature.abstractAI as OverseerAbstractAI).worldAI.shelterFinder.DistanceToShelter(i, new WorldCoordinate(overseer.room.abstractRoom.index, -1, -1, j));
							if (num6 > -1f && num6 < num5)
							{
								num4 = j;
								num5 = num6;
							}
						}
					}
					if (num4 > -1)
					{
						if (overseer.room.game.rainWorld.progression.miscProgressionData.GetDiscoveredShelterStringsInRegion(overseer.room.world.region.name).Contains(overseer.room.world.GetAbstractRoom(overseer.room.world.shelters[i]).name))
						{
							Custom.Log("shelter already visited:", overseer.room.world.GetAbstractRoom(overseer.room.world.shelters[i]).name);
							num5 = (overseer.AI.communication.firstFewCycles ? (num5 / 3f) : ((!(communicateWith is Player) || (communicateWith as Player).Karma < (communicateWith as Player).KarmaCap / 2) ? (num5 / 1.5f) : (num5 * Custom.LerpMap((communicateWith as Player).Karma, (communicateWith as Player).KarmaCap / 2, (communicateWith as Player).KarmaCap, 1.1f, 2f))));
						}
						if (overseer.room.abstractRoom.connections[num4] == overseer.AI.communication.lastPlayerRoom || i == overseer.AI.communication.unWantedShelter)
						{
							num5 = num5 * 20f + 10000f;
						}
						if (num5 < num2)
						{
							num2 = num5;
							num = num4;
							num3 = i;
						}
					}
				}
				if (num > -1)
				{
					base.door = num;
					currentlyShowingToShelter = num3;
				}
				else
				{
					overseer.AI.communication.noShelterDirectionFromRoom = room.abstractRoom.index;
					stillRelevant = false;
				}
			}
			if (stillRelevant && base.door > -1 && base.door < overseer.room.abstractRoom.connections.Length && overseer.room.abstractRoom.connections[base.door] > -1 && overseer.room.world.GetAbstractRoom(overseer.room.abstractRoom.connections[base.door]).shelter)
			{
				showingAShelterDoor = true;
			}
			else if (showingAShelterDoor)
			{
				Custom.Log("has showed a shelter, but got dissed");
				overseer.AI.communication.hasAlreadyShowedPlayerToAShelter = true;
			}
		}

		public override void PlayerGoingIntoExit(bool followingInstruction)
		{
			base.PlayerGoingIntoExit(followingInstruction);
			if (!followingInstruction)
			{
				Custom.Log("player didn't follow. Avoid shelter:", currentlyShowingToShelter.ToString());
				overseer.AI.communication.unWantedShelter = currentlyShowingToShelter;
			}
		}
	}

	public class DirectionPointer : DoorPointer
	{
		public int lastRoom = -1;

		public int cycle;

		public override Color color
		{
			get
			{
				if (cycle % 30 < 15)
				{
					return base.color;
				}
				return new Color(1f, 1f, 1f);
			}
		}

		public DirectionPointer(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			symbol = new Symbol(this, totalSprites, OverseerGuidanceSymbol(overseer.AI.communication.GuideState.guideSymbol));
			AddPart(symbol);
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			cycle++;
			if (lastRoom == overseer.room.abstractRoom.index)
			{
				return;
			}
			lastRoom = overseer.room.abstractRoom.index;
			int num = -1;
			float num2 = float.MaxValue;
			for (int i = 0; i < overseer.room.abstractRoom.connections.Length; i++)
			{
				if (overseer.room.abstractRoom.connections[i] > -1)
				{
					float num3 = -1f;
					if ((overseer.abstractCreature.abstractAI as OverseerAbstractAI).worldAI != null && (overseer.abstractCreature.abstractAI as OverseerAbstractAI).worldAI.directionFinder != null)
					{
						num3 = (overseer.abstractCreature.abstractAI as OverseerAbstractAI).worldAI.directionFinder.DistanceToDestination(new WorldCoordinate(overseer.room.abstractRoom.index, -1, -1, i));
					}
					if (num3 > -1f && num3 < num2)
					{
						num = i;
						num2 = num3;
					}
				}
			}
			if (num > -1)
			{
				base.door = num;
				return;
			}
			overseer.AI.communication.noProgressionDirectionFromRoom = room.abstractRoom.index;
			stillRelevant = false;
		}
	}

	public class ForcedDirectionPointer : DoorPointer
	{
		public ReliableIggyDirection direction;

		public int cycle;

		public override Color color
		{
			get
			{
				if (direction.data.symbol == ReliableIggyDirection.ReliableIggyDirectionData.Symbol.Food)
				{
					if (cycle % 60 < 30)
					{
						return base.color;
					}
					return new Color(0f, 1f, 0.6f);
				}
				if (direction.data.symbol == ReliableIggyDirection.ReliableIggyDirectionData.Symbol.SlugcatFace || direction.data.symbol == ReliableIggyDirection.ReliableIggyDirectionData.Symbol.DynamicDirection)
				{
					if (cycle % 30 < 15)
					{
						return base.color;
					}
					return new Color(1f, 1f, 1f);
				}
				if (direction.data.symbol == ReliableIggyDirection.ReliableIggyDirectionData.Symbol.Danger)
				{
					if (cycle % 30 < 15)
					{
						return base.color;
					}
					return new Color(1f, 0f, 0f);
				}
				return base.color;
			}
		}

		public ForcedDirectionPointer(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			direction = overseer.AI.communication.forcedDirectionToGive;
			string elementName = "GuidanceSlugcat";
			if (direction.data.symbol == ReliableIggyDirection.ReliableIggyDirectionData.Symbol.Shelter)
			{
				elementName = "shelterSymbol";
			}
			else if (direction.data.symbol == ReliableIggyDirection.ReliableIggyDirectionData.Symbol.Food)
			{
				elementName = "foodSymbol";
			}
			else if (direction.data.symbol == ReliableIggyDirection.ReliableIggyDirectionData.Symbol.DynamicDirection)
			{
				elementName = OverseerGuidanceSymbol(overseer.AI.communication.GuideState.guideSymbol);
			}
			else if (direction.data.symbol == ReliableIggyDirection.ReliableIggyDirectionData.Symbol.Danger)
			{
				elementName = "miscDangerSymbol";
			}
			else if (direction.data.symbol == ReliableIggyDirection.ReliableIggyDirectionData.Symbol.Bat)
			{
				elementName = "batSymbol";
			}
			symbol = new Symbol(this, totalSprites, elementName);
			AddPart(symbol);
			Custom.Log("forced dir");
		}

		public override void Update(bool eu)
		{
			cycle++;
			base.Update(eu);
			if (direction == null || direction.room != overseer.room)
			{
				stillRelevant = false;
				return;
			}
			base.door = direction.data.exit;
			pointerNecessary = true;
			symbol.visible = true;
			lightEffect.visible = true;
		}
	}

	public class ObjectPointer : PointingHologram
	{
		public PhysicalObject pointAtObject;

		public new Arrow arrow;

		public override Vector2 PointAt
		{
			get
			{
				if (pointAtObject != null)
				{
					return pointAtObject.firstChunk.pos;
				}
				return overseer.firstChunk.pos;
			}
		}

		public ObjectPointer(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			arrow = new Arrow(this, totalSprites);
			AddPart(arrow);
			room = overseer.room;
		}

		public ObjectPointer(AncientBot robo, Message message, Creature communicateWith, float importance)
			: base(robo, message, communicateWith, importance)
		{
			arrow = new Arrow(this, totalSprites);
			AddPart(arrow);
			room = robo.room;
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			arrow.dir = Custom.DirVec(pos, PointAt);
			arrow.visible = !room.ViewedByAnyCamera(PointAt, -10f);
		}
	}

	public class CreaturePointer : ObjectPointer
	{
		public int hasWarnedCounterVisible;

		public int hasWarnedCounterOffScreen;

		public int cycle;

		public Creature pointAtCreature
		{
			get
			{
				return pointAtObject as Creature;
			}
			set
			{
				pointAtObject = value;
			}
		}

		public override Vector2 PointAt
		{
			get
			{
				if (pointAtCreature != null)
				{
					return pointAtCreature.DangerPos;
				}
				return base.PointAt;
			}
		}

		public override Color color
		{
			get
			{
				if (cycle % 30 < 15)
				{
					return base.color;
				}
				return new Color(1f, 0f, 0f);
			}
		}

		public CreaturePointer(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			symbol = new Symbol(this, totalSprites, "miscDangerSymbol");
			AddPart(symbol);
		}

		public CreaturePointer(AncientBot robo, Message message, Creature communicateWith, float importance)
			: base(robo, message, communicateWith, importance)
		{
			symbol = new Symbol(this, totalSprites, "miscDangerSymbol");
			AddPart(symbol);
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			if (robo != null)
			{
				cycle++;
			}
			else
			{
				if (!(message == Message.DangerousCreature))
				{
					return;
				}
				if (overseer.AI.communication.mostDangerousCreatureInRoom != null)
				{
					pointAtCreature = overseer.AI.communication.mostDangerousCreatureInRoom.realizedCreature;
				}
				importance = overseer.AI.communication.mostDangerousCreatureDanger;
				if (fade > 0.8f && pointAtCreature != null)
				{
					if (room.ViewedByAnyCamera(PointAt, -10f) && pointAtCreature.Template.type != CreatureTemplate.Type.PoleMimic)
					{
						hasWarnedCounterVisible++;
						if (hasWarnedCounterVisible > (overseer.AI.communication.GuideState.creatureTypes.Contains(pointAtCreature.Template.type) ? 10 : 40))
						{
							overseer.AI.communication.PlayerHasNowBeenWarnedOfCreature(pointAtCreature.abstractCreature, creatureTypeNowHandled: true);
							stillRelevant = false;
							hasWarnedCounterVisible = 0;
						}
					}
					else
					{
						hasWarnedCounterOffScreen++;
						if (hasWarnedCounterOffScreen > (int)Mathf.Lerp(80f, 120f, overseer.AI.communication.GuideState.handHolding))
						{
							overseer.AI.communication.PlayerHasNowBeenWarnedOfCreature(pointAtCreature.abstractCreature, creatureTypeNowHandled: false);
							stillRelevant = false;
							hasWarnedCounterOffScreen = 0;
						}
					}
				}
				if (importance == 0f || pointAtCreature == null)
				{
					stillRelevant = false;
				}
				cycle++;
			}
		}
	}

	public class FoodPointer : ObjectPointer
	{
		public int hasToldCounter;

		public int cycle;

		public override Color color
		{
			get
			{
				if (cycle % 60 < 30)
				{
					return base.color;
				}
				return new Color(0f, 1f, 0.6f);
			}
		}

		public FoodPointer(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			symbol = new CyclingSymbol(this, totalSprites, new List<string> { "foodSymbol" }, 15);
			AddPart(symbol);
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			if (overseer.AI.communication.mostDeliciousFoodInRoom != null)
			{
				if (pointAtObject != overseer.AI.communication.mostDeliciousFoodInRoom.realizedObject)
				{
					if (overseer.AI.communication.mostDeliciousFoodInRoom.realizedObject is SeedCob && !(overseer.AI.communication.mostDeliciousFoodInRoom.realizedObject as SeedCob).AbstractCob.opened)
					{
						(symbol as CyclingSymbol).elementNames = new List<string> { "foodSymbol", "spearSymbol" };
					}
					else
					{
						(symbol as CyclingSymbol).elementNames = new List<string> { "foodSymbol" };
					}
				}
				pointAtObject = overseer.AI.communication.mostDeliciousFoodInRoom.realizedObject;
			}
			importance = overseer.AI.communication.mostDelicousFoodDelicious;
			if (fade > 0.6f && room.ViewedByAnyCamera(PointAt, -10f))
			{
				hasToldCounter++;
				if (pointAtObject != null && hasToldCounter == ((pointAtObject is SeedCob) ? 120 : 40))
				{
					overseer.AI.communication.PlayerHasBeenToldAboutFood(pointAtObject.abstractPhysicalObject);
				}
			}
			if (importance == 0f || pointAtObject == null)
			{
				stillRelevant = false;
			}
			cycle++;
		}

		public override float DisplayPosScore(IntVector2 testPos)
		{
			float num = Vector2.Distance(room.MiddleOfTile(testPos), Vector2.Lerp(PointAt, Custom.MoveTowards(PointAt, communicateWith.DangerPos, 50f), 0.5f));
			if (!room.ViewedByAnyCamera(room.MiddleOfTile(testPos), -20f))
			{
				num += 10000f;
			}
			return num;
		}
	}

	public Overseer overseer;

	public bool overseerSitStill;

	public Vector2 pos;

	public Vector2 lastPos;

	public Creature communicateWith;

	public bool lookAtCommunicationCreature;

	public int lookAtCommCritCounter;

	public int totalSprites;

	public List<HologramPart> parts;

	public IntVector2 displayTile;

	public IntVector2 tempDisplayTile;

	public float fade;

	public float lastFade;

	public bool stillRelevant = true;

	public float importance = 0.5f;

	private Vector2 pushAroundPos;

	public Message message;

	public AncientBot robo;

	public virtual Color color
	{
		get
		{
			if (robo != null)
			{
				return new Color(1f, 0f, 0f);
			}
			if (overseer.graphicsModule != null)
			{
				return Color.Lerp((overseer.graphicsModule as OverseerGraphics).MainColor, (overseer.graphicsModule as OverseerGraphics).ColorOfSegment(0f, 0f), 0.5f);
			}
			return new Color(1f, 1f, 1f);
		}
	}

	public virtual Vector2 lookAt
	{
		get
		{
			if (fade > 0f && fade < 1f)
			{
				return pos;
			}
			if (communicateWith == null || !lookAtCommunicationCreature)
			{
				return pos;
			}
			return communicateWith.DangerPos;
		}
	}

	public OverseerHologram(Overseer overseer, Message message, Creature communicateWith, float importance)
	{
		this.overseer = overseer;
		this.message = message;
		this.communicateWith = communicateWith;
		this.importance = importance;
		parts = new List<HologramPart>();
	}

	public OverseerHologram(AncientBot robo, Message message, Creature communicateWith, float importance)
	{
		this.robo = robo;
		this.message = message;
		this.communicateWith = communicateWith;
		this.importance = importance;
		parts = new List<HologramPart>();
	}

	public void AddPart(HologramPart part)
	{
		parts.Add(part);
		totalSprites += part.totalSprites;
	}

	public static string OverseerGuidanceSymbol(int selector)
	{
		switch (selector)
		{
		case 1:
			return "GuidanceMoon";
		case 2:
			return "GuidanceNeuron";
		default:
			if (ModManager.MSC && selector == 3)
			{
				return "GuidancePebbles";
			}
			if (ModManager.MSC && selector == 4)
			{
				return "GuidanceEnergyCell";
			}
			return "GuidanceSlugcat";
		}
	}

	public override void Update(bool eu)
	{
		base.Update(eu);
		if ((overseer != null && overseer.room != room) || (robo != null && robo.room != room))
		{
			Destroy();
			return;
		}
		lastPos = pos;
		lookAtCommCritCounter--;
		if (lookAtCommCritCounter < 1)
		{
			lookAtCommunicationCreature = !lookAtCommunicationCreature;
			lookAtCommCritCounter = UnityEngine.Random.Range(20, lookAtCommunicationCreature ? 120 : 40);
		}
		for (int i = 0; i < parts.Count; i++)
		{
			parts[i].Update();
		}
		for (int j = 0; j < 10; j++)
		{
			IntVector2 testPos = ((UnityEngine.Random.value < 0.5f) ? room.GetTilePosition(((overseer != null) ? overseer.firstChunk.pos : robo.Pos) + Custom.RNV() * (UnityEngine.Random.value * 400f)) : new IntVector2(UnityEngine.Random.Range(0, room.TileWidth), UnityEngine.Random.Range(0, room.TileHeight)));
			if (DisplayPosScore(testPos) < DisplayPosScore(tempDisplayTile))
			{
				tempDisplayTile = testPos;
			}
			if (DisplayPosScore(tempDisplayTile) < DisplayPosScore(displayTile) - 50f)
			{
				displayTile = tempDisplayTile;
			}
		}
		lastFade = fade;
		if (overseer != null)
		{
			if ((overseer.mode == Overseer.Mode.Watching || overseer.mode == Overseer.Mode.Projecting) && stillRelevant && displayTile.FloatDist(overseer.hoverTile) < 15f && Custom.DistLess(pos, room.MiddleOfTile(displayTile), 200f))
			{
				fade = Custom.LerpAndTick(fade, 1f, 0.01f, 0.05f);
			}
			else
			{
				fade = Custom.LerpAndTick(fade, 0f, 0.01f, 0.1f);
			}
			pushAroundPos *= 0.8f;
			if (overseer.extended > 0f)
			{
				pushAroundPos += (overseer.firstChunk.pos - overseer.firstChunk.lastPos) * overseer.extended;
			}
		}
		else
		{
			fade = (stillRelevant ? 1f : 0f);
		}
		if (fade == 0f && lastFade == 0f)
		{
			pos = room.MiddleOfTile(displayTile) + pushAroundPos;
			lastPos = pos;
			if (!stillRelevant)
			{
				Destroy();
			}
		}
		else if (Custom.DistLess(pos, room.MiddleOfTile(displayTile), 200f))
		{
			pos = Custom.MoveTowards(pos, room.MiddleOfTile(displayTile) + pushAroundPos, 30f);
			pos = Vector2.Lerp(pos, room.MiddleOfTile(displayTile) + pushAroundPos, 0.05f);
		}
		fade = Mathf.Min(fade, 0.2f + 0.8f * Mathf.InverseLerp(20f, 2f, Vector2.Distance(lastPos, pos)));
		if (robo != null)
		{
			fade = Mathf.Clamp(robo.gXScaleFactor * robo.gYScaleFactor, 0.01f, 1f) * UnityEngine.Random.Range(0.9f, 1f);
			if (!stillRelevant)
			{
				fade = 0f;
			}
			pos = robo.Pos;
			if (this is PointingHologram)
			{
				float num = Mathf.Clamp((this as PointingHologram).PointAt.x - robo.Pos.x, -32f, 32f);
				if (num > -20f && num < 0f)
				{
					num = -20f;
				}
				else if (num < 20f && num >= 0f)
				{
					num = 20f;
				}
				pos = robo.Pos + new Vector2(num, 0f);
			}
		}
		if (overseer != null && overseer.room != room)
		{
			stillRelevant = false;
		}
		if (communicateWith != null && communicateWith.room != null && (communicateWith.room != room || communicateWith.dead || communicateWith.grabbedBy.Count > 0))
		{
			stillRelevant = false;
		}
	}

	public void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
	{
		sLeaser.sprites = new FSprite[totalSprites];
		for (int i = 0; i < parts.Count; i++)
		{
			parts[i].InitiateSprites(sLeaser, rCam);
			if (parts[i].allSpritesHologramShader)
			{
				for (int j = parts[i].firstSprite; j < parts[i].firstSprite + parts[i].totalSprites; j++)
				{
					sLeaser.sprites[j].shader = rCam.game.rainWorld.Shaders["Hologram"];
				}
			}
		}
		AddToContainer(sLeaser, rCam, null);
	}

	public void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
	{
		float num = Mathf.Pow(Mathf.Max(0f, Mathf.Lerp(lastFade, fade, timeStacker)), 0.2f);
		Vector2 zero = Vector2.zero;
		zero = ((robo == null) ? ((overseer.room != null && !overseer.slatedForDeletetion && overseer.graphicsModule != null) ? (overseer.graphicsModule as OverseerGraphics).DrawPosOfSegment(0f, timeStacker) : Vector2.Lerp(overseer.mainBodyChunk.lastPos, overseer.mainBodyChunk.pos, timeStacker)) : robo.Pos);
		for (int i = 0; i < parts.Count; i++)
		{
			Vector2 vector = Vector2.Lerp(lastPos, pos, timeStacker) + Vector2.Lerp(parts[i].lastOffset, parts[i].offset, timeStacker);
			float t = Mathf.Lerp(parts[i].lastTransform, parts[i].transform, timeStacker);
			float num2 = Mathf.Pow(Mathf.Max(0f, Mathf.Lerp(parts[i].lastPartFade, parts[i].partFade, timeStacker) * Mathf.Lerp(lastFade, fade, timeStacker)), parts[i].fadeExponent);
			Color useColor = Color.Lerp(parts[i].lastColor, parts[i].color, timeStacker);
			parts[i].DrawSprites(sLeaser, rCam, timeStacker, camPos, vector, zero, num2, num, useColor);
			for (int j = 0; j < parts[i].lines.Count; j++)
			{
				if (UnityEngine.Random.value < Mathf.Pow(num2, 2f))
				{
					sLeaser.sprites[parts[i].lines[j].sprite].isVisible = true;
					Vector3 b = Rotate3DPos(Vector3.Lerp(parts[i].lines[j].A, parts[i].lines[j].A2, t), Mathf.LerpAngle(parts[i].lastRotation.x, parts[i].rotation.x, timeStacker) / 360f, Mathf.LerpAngle(parts[i].lastRotation.y, parts[i].rotation.y, timeStacker) / 360f, Mathf.LerpAngle(parts[i].lastRotation.z, parts[i].rotation.z, timeStacker) / 360f) + (Vector3)vector;
					Vector3 b2 = Rotate3DPos(Vector3.Lerp(parts[i].lines[j].B, parts[i].lines[j].B2, t), Mathf.LerpAngle(parts[i].lastRotation.x, parts[i].rotation.x, timeStacker) / 360f, Mathf.LerpAngle(parts[i].lastRotation.y, parts[i].rotation.y, timeStacker) / 360f, Mathf.LerpAngle(parts[i].lastRotation.z, parts[i].rotation.z, timeStacker) / 360f) + (Vector3)vector;
					b = Vector3.Lerp(zero, b, num);
					b2 = Vector3.Lerp(zero, b2, num);
					if (UnityEngine.Random.value > num2)
					{
						if (UnityEngine.Random.value > Mathf.Pow(num2, 0.05f))
						{
							b = zero;
						}
						else if (UnityEngine.Random.value > num2)
						{
							b = Vector3.Lerp(b, zero, UnityEngine.Random.value);
						}
						if (UnityEngine.Random.value > Mathf.Pow(num2, 0.05f))
						{
							b2 = zero;
						}
						else if (UnityEngine.Random.value > num2)
						{
							b2 = Vector3.Lerp(b2, zero, UnityEngine.Random.value);
						}
					}
					b = ApplyDepthOnVector(b, rCam, camPos);
					b2 = ApplyDepthOnVector(b2, rCam, camPos);
					sLeaser.sprites[parts[i].lines[j].sprite].x = b.x;
					sLeaser.sprites[parts[i].lines[j].sprite].y = b.y;
					sLeaser.sprites[parts[i].lines[j].sprite].rotation = Custom.AimFromOneVectorToAnother(b, b2);
					sLeaser.sprites[parts[i].lines[j].sprite].scaleY = Vector2.Distance(b, b2);
					sLeaser.sprites[parts[i].lines[j].sprite].color = useColor;
					sLeaser.sprites[parts[i].lines[j].sprite].alpha = Mathf.Pow(num2, 0.5f);
				}
				else
				{
					sLeaser.sprites[parts[i].lines[j].sprite].isVisible = false;
				}
			}
		}
		if (base.slatedForDeletetion || room != rCam.room)
		{
			sLeaser.CleanSpritesAndRemove();
		}
	}

	public void ApplyPalette(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, RoomPalette palette)
	{
		for (int i = 0; i < parts.Count; i++)
		{
			parts[i].ApplyPalette(sLeaser, rCam, palette);
		}
	}

	public void AddToContainer(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, FContainer newContatiner)
	{
		if (newContatiner == null)
		{
			newContatiner = rCam.ReturnFContainer("Bloom");
		}
		for (int i = 0; i < sLeaser.sprites.Length; i++)
		{
			sLeaser.sprites[i].RemoveFromContainer();
			newContatiner.AddChild(sLeaser.sprites[i]);
		}
	}

	public virtual float DisplayPosScore(IntVector2 testPos)
	{
		float num = 0f;
		if (room.GetTile(testPos).Solid)
		{
			num += 1000f;
		}
		if (testPos.y < room.defaultWaterLevel + 5)
		{
			num += 500f;
		}
		if (room.readyForAI)
		{
			num -= (float)Math.Min(room.aimap.getTerrainProximity(testPos), 5) * 50f;
		}
		if (communicateWith != null)
		{
			if (Custom.DistLess(room.MiddleOfTile(testPos), communicateWith.DangerPos, 100f))
			{
				num += 1000f;
			}
			if (communicateWith is Player && room.ViewedByAnyCamera(room.MiddleOfTile(testPos), -100f))
			{
				num -= 100000f;
			}
		}
		return num;
	}

	public Vector3 Rotate3DPos(Vector3 position, float rX, float rY, float rZ)
	{
		float z = position.z * Mathf.Cos(rY * (float)Math.PI * 2f) - position.x * Mathf.Sin(rY * (float)Math.PI * 2f);
		position.x = position.z * Mathf.Sin(rY * (float)Math.PI * 2f) + position.x * Mathf.Cos(rY * (float)Math.PI * 2f);
		position.z = z;
		float x = position.x * Mathf.Cos(rZ * (float)Math.PI * 2f) - position.y * Mathf.Sin(rZ * (float)Math.PI * 2f);
		position.y = position.x * Mathf.Sin(rZ * (float)Math.PI * 2f) + position.y * Mathf.Cos(rZ * (float)Math.PI * 2f);
		position.x = x;
		float y = position.y * Mathf.Cos(rX * (float)Math.PI * 2f) - position.z * Mathf.Sin(rX * (float)Math.PI * 2f);
		position.z = position.y * Mathf.Sin(rX * (float)Math.PI * 2f) + position.z * Mathf.Cos(rX * (float)Math.PI * 2f);
		position.y = y;
		return position;
	}

	public Vector2 ApplyDepthOnVector(Vector3 A, RoomCamera rCam, Vector2 camPos)
	{
		A -= new Vector3(camPos.x, camPos.y, 0f);
		A.x -= rCam.game.rainWorld.screenSize.x / 2f;
		A.x *= 1f - A.z * 0.0015f;
		A.x += rCam.game.rainWorld.screenSize.x / 2f;
		A.y -= rCam.game.rainWorld.screenSize.y * (2f / 3f);
		A.y *= 1f - A.z * 0.0015f;
		A.y += rCam.game.rainWorld.screenSize.y * (2f / 3f);
		return A;
	}

	public virtual float InfluenceHoverScoreOfTile(IntVector2 testTile, float f)
	{
		return f;
	}
}
