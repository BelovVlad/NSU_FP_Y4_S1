using System;
using System.Collections.Generic;
using MoreSlugcats;
using RWCustom;
using UnityEngine;

public class OverseerAI : ArtificialIntelligence
{
	public Vector2 lookAt;

	public Vector2 lookAtAdd;

	private Vector2 slowLookAt;

	private List<Vector2> lastLookAtAirPositions;

	private int lookAtSameAirPosCounter;

	public AbstractCreature casualInterestCreature;

	public float casualInterestBonus;

	public IntVector2 tempHoverTile = new IntVector2(16, 21);

	public float targetStationary;

	public float[,] zipPathingMatrix;

	public List<IntVector2> addToPathingList;

	public List<IntVector2> avoidPositions;

	public Vector2 lastTargetPos;

	public float bringUpLens;

	public float randomBringUpLensBonus;

	private Weapon lookAtFlyingWeapon;

	public OverseerTutorialBehavior tutorialBehavior;

	public OverseerCommunicationModule communication;

	private float scaredDistance = 130f;

	public IntVector2 zipPathMatrixOffset;

	public Overseer overseer => creature.realizedCreature as Overseer;

	public OverseersWorldAI worldAI => creature.world.overseersWorldAI;

	public Vector2 CosmeticLookAt => slowLookAt + lookAtAdd * (Vector2.Distance(overseer.mainBodyChunk.pos, lookAt) * 0.2f);

	public AbstractCreature targetCreature
	{
		get
		{
			if (ModManager.MMF && (overseer.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature == overseer.abstractCreature)
			{
				return null;
			}
			return (overseer.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature;
		}
		set
		{
			(overseer.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature = value;
		}
	}

	public OverseerAI(AbstractCreature abstractCreature, World world)
		: base(abstractCreature, world)
	{
		overseer.AI = this;
		addToPathingList = new List<IntVector2>();
		avoidPositions = new List<IntVector2>();
		lastLookAtAirPositions = new List<Vector2>();
		randomBringUpLensBonus = UnityEngine.Random.value;
		if (overseer.PlayerGuide)
		{
			communication = new OverseerCommunicationModule(this);
			AddModule(communication);
		}
	}

	public override void NewRoom(Room room)
	{
		base.NewRoom(room);
		lastLookAtAirPositions.Clear();
		avoidPositions.Clear();
		slowLookAt = lookAt;
	}

	public float LikeOfPlayer(AbstractCreature player)
	{
		if (overseer.PlayerGuide)
		{
			return Mathf.InverseLerp(-1f, 1f, (creature.world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState.likesPlayer);
		}
		return 0f;
	}

	public override void Update()
	{
		base.Update();
		slowLookAt = Vector2.Lerp(Custom.MoveTowards(slowLookAt, lookAt, 60f), lookAt, 0.02f);
		if (UnityEngine.Random.value < 0.0125f)
		{
			casualInterestBonus = Mathf.Pow(UnityEngine.Random.value, 3f) * 2f * ((UnityEngine.Random.value < 0.5f) ? (-1f) : 1f);
		}
		if (this.overseer.hologram != null)
		{
			lookAt = this.overseer.hologram.lookAt;
		}
		else if (this.overseer.SandboxOverseer && !this.overseer.editCursor.menuMode)
		{
			lookAt = this.overseer.editCursor.pos;
		}
		else if (ModManager.MSC && (this.overseer.abstractCreature.abstractAI as OverseerAbstractAI).moonHelper && this.overseer.room.world.game.IsMoonActive() && (this.overseer.abstractCreature.Room.name == "SL_AI" || this.overseer.abstractCreature.Room.name == "RM_AI"))
		{
			for (int i = 0; i < this.overseer.room.physicalObjects.Length; i++)
			{
				for (int j = 0; j < this.overseer.room.physicalObjects[i].Count; j++)
				{
					if (this.overseer.room.physicalObjects[i][j] is Oracle)
					{
						lookAt = this.overseer.room.physicalObjects[i][j].firstChunk.pos;
					}
				}
			}
		}
		else
		{
			bool flag = casualInterestCreature != null && casualInterestCreature.realizedCreature != null && casualInterestCreature.pos.room == this.overseer.room.abstractRoom.index && tutorialBehavior == null;
			if (flag)
			{
				flag = ((targetCreature == null || targetCreature.realizedCreature == null || targetCreature.realizedCreature.room != this.overseer.room) ? (RealizedCreatureInterest(casualInterestCreature.realizedCreature) + casualInterestBonus > 0f) : (RealizedCreatureInterest(casualInterestCreature.realizedCreature) + casualInterestBonus > RealizedCreatureInterest(targetCreature.realizedCreature)));
			}
			if (lookAtFlyingWeapon != null)
			{
				lookAt = lookAtFlyingWeapon.firstChunk.pos;
				if (lookAtFlyingWeapon.slatedForDeletetion || lookAtFlyingWeapon.mode != Weapon.Mode.Thrown)
				{
					lookAtFlyingWeapon = null;
				}
			}
			else if (flag)
			{
				lookAt = casualInterestCreature.realizedCreature.DangerPos;
				LensUpdate(casualInterestCreature.realizedCreature);
			}
			else if (targetCreature != null && targetCreature.realizedCreature != null && targetCreature.realizedCreature.room == this.overseer.room)
			{
				lookAt = targetCreature.realizedCreature.DangerPos;
				LensUpdate(targetCreature.realizedCreature);
			}
			else
			{
				targetStationary = Mathf.Max(0f, targetStationary - 1f / 120f);
				Vector2 testPos = ((!(UnityEngine.Random.value < 0.1f)) ? (lookAt + Custom.RNV() * (Mathf.Pow(UnityEngine.Random.value, 3f) * 600f)) : (this.overseer.mainBodyChunk.pos + Custom.RNV() * (UnityEngine.Random.value * 600f)));
				if (LookAtAirPosScore(testPos) > LookAtAirPosScore(lookAt))
				{
					lookAt = testPos;
					lookAtSameAirPosCounter = UnityEngine.Random.Range(30, 130);
				}
				else
				{
					lookAtSameAirPosCounter--;
					if (lookAtSameAirPosCounter < 1)
					{
						lastLookAtAirPositions.Insert(0, lookAt);
						if (lastLookAtAirPositions.Count > 10)
						{
							lastLookAtAirPositions.RemoveAt(lastLookAtAirPositions.Count - 1);
						}
						lookAtSameAirPosCounter = UnityEngine.Random.Range(30, 130);
					}
				}
			}
		}
		if (UnityEngine.Random.value < 0.025f)
		{
			lookAtAdd = Custom.RNV() * UnityEngine.Random.value;
		}
		UpdateZipMatrix();
		UpdateTempHoverPosition();
		if (this.overseer.mode == Overseer.Mode.Watching || this.overseer.mode == Overseer.Mode.Projecting)
		{
			if (this.overseer.room.abstractRoom.creatures.Count == 0)
			{
				return;
			}
			AbstractCreature abstractCreature = this.overseer.room.abstractRoom.creatures[UnityEngine.Random.Range(0, this.overseer.room.abstractRoom.creatures.Count)];
			if (abstractCreature.realizedCreature != null)
			{
				if (abstractCreature.creatureTemplate.type != CreatureTemplate.Type.Overseer)
				{
					if (!abstractCreature.creatureTemplate.smallCreature && !abstractCreature.realizedCreature.dead && Custom.DistLess(this.overseer.rootPos, abstractCreature.realizedCreature.DangerPos, scaredDistance))
					{
						casualInterestCreature = abstractCreature;
						this.overseer.afterWithdrawMode = Overseer.Mode.SittingInWall;
						this.overseer.SwitchModes(Overseer.Mode.Withdrawing);
					}
					else if (targetCreature != abstractCreature && (casualInterestCreature == null || RealizedCreatureInterest(abstractCreature.realizedCreature) > RealizedCreatureInterest(casualInterestCreature.realizedCreature) + 0.1f || targetCreature == casualInterestCreature) && this.overseer.room.VisualContact(this.overseer.mainBodyChunk.pos, abstractCreature.realizedCreature.mainBodyChunk.pos))
					{
						casualInterestCreature = abstractCreature;
					}
				}
				else if (abstractCreature.creatureTemplate.type == CreatureTemplate.Type.Scavenger && (creature.abstractAI as OverseerAbstractAI).goToPlayer)
				{
					(creature.abstractAI as OverseerAbstractAI).PlayerGuideGoAway(UnityEngine.Random.Range(200, 1200));
					Custom.Log("player guide leaving because scavs in room");
				}
				else if (this.overseer.mode != Overseer.Mode.Projecting && this.overseer.conversationDelay == 0)
				{
					Overseer overseer = abstractCreature.realizedCreature as Overseer;
					if (Custom.DistLess(this.overseer.rootPos, overseer.rootPos, 70f * this.overseer.size + 70f + overseer.size) && overseer.mode == Overseer.Mode.Watching && overseer.conversationPartner == null && overseer.conversationDelay == 0 && this.overseer.lastConversationPartner != overseer)
					{
						this.overseer.conversationPartner = overseer;
						overseer.conversationPartner = this.overseer;
						this.overseer.SwitchModes(Overseer.Mode.Conversing);
						overseer.SwitchModes(Overseer.Mode.Conversing);
						this.overseer.conversationDelay = UnityEngine.Random.Range(30, 190);
						overseer.conversationDelay = UnityEngine.Random.Range(30, 190);
					}
				}
			}
		}
		else if (this.overseer.mode == Overseer.Mode.SittingInWall)
		{
			bool flag2 = false;
			for (int k = 0; k < this.overseer.room.abstractRoom.creatures.Count; k++)
			{
				if (flag2)
				{
					break;
				}
				if (this.overseer.room.abstractRoom.creatures[k].realizedCreature != null && this.overseer.room.abstractRoom.creatures[k].creatureTemplate.type != CreatureTemplate.Type.Overseer && !this.overseer.room.abstractRoom.creatures[k].creatureTemplate.smallCreature && !this.overseer.room.abstractRoom.creatures[k].realizedCreature.dead && Custom.DistLess(this.overseer.rootPos, this.overseer.room.abstractRoom.creatures[k].realizedCreature.DangerPos, 200f))
				{
					flag2 = true;
				}
			}
			if (!flag2)
			{
				this.overseer.SwitchModes(Overseer.Mode.Emerging);
			}
		}
		else if (this.overseer.mode == Overseer.Mode.Conversing)
		{
			if (this.overseer.conversationPartner == null || this.overseer.conversationPartner.room != this.overseer.room || this.overseer.conversationPartner.mode != Overseer.Mode.Conversing || this.overseer.conversationPartner.conversationPartner != this.overseer)
			{
				this.overseer.SwitchModes(Overseer.Mode.Watching);
			}
			else
			{
				lookAt = this.overseer.conversationPartner.mainBodyChunk.pos;
			}
		}
		if (ModManager.MMF && MMF.cfgExtraTutorials.Value && this.overseer.PlayerGuide && creature.world.game.session is StoryGameSession && tutorialBehavior == null && this.overseer.room.game.Players.Count > 0 && this.overseer.room.abstractRoom == this.overseer.room.game.Players[0].Room && !creature.world.game.GetStorySession.saveState.deathPersistentSaveData.GateStandTutorial && (this.overseer.room.game.Players[0].Room.name == "GATE_SU_DS" || this.overseer.room.game.Players[0].Room.name == "GATE_SU_HI"))
		{
			tutorialBehavior = new OverseerTutorialBehavior(this);
			AddModule(tutorialBehavior);
			return;
		}
		creature.abstractAI.AbstractBehavior(1);
		AbstractCreature abstractCreature2 = null;
		if (this.overseer.room != null && this.overseer.room.game.FirstAlivePlayer != null)
		{
			abstractCreature2 = this.overseer.room.game.FirstAlivePlayer;
		}
		if (this.overseer.PlayerGuide && creature.world.game.session is StoryGameSession && (creature.world.game.session as StoryGameSession).saveState.cycleNumber == 0 && tutorialBehavior == null && this.overseer.room.game.Players.Count > 0 && abstractCreature2 != null && this.overseer.room.abstractRoom == this.overseer.room.game.Players[0].Room && this.overseer.room.world.region.name == "SU")
		{
			OverseerAbstractAI.DefineTutorialRooms();
			for (int l = 0; l < OverseerAbstractAI.tutorialRooms.Length; l++)
			{
				if (abstractCreature2.Room.name == OverseerAbstractAI.tutorialRooms[l])
				{
					tutorialBehavior = new OverseerTutorialBehavior(this);
					AddModule(tutorialBehavior);
					break;
				}
			}
		}
		if (ModManager.MMF && MMF.cfgExtraTutorials.Value && this.overseer.PlayerGuide && creature.world.game.session is StoryGameSession && tutorialBehavior == null && this.overseer.room.game.Players.Count > 0 && abstractCreature2 != null && this.overseer.room.abstractRoom == abstractCreature2.Room && !creature.world.game.GetStorySession.saveState.deathPersistentSaveData.GateStandTutorial && (abstractCreature2.Room.name == "GATE_SU_DS" || abstractCreature2.Room.name == "GATE_SU_HI"))
		{
			tutorialBehavior = new OverseerTutorialBehavior(this);
			AddModule(tutorialBehavior);
		}
		else
		{
			creature.abstractAI.AbstractBehavior(1);
		}
	}

	private void LensUpdate(Creature crit)
	{
		targetStationary = Mathf.Clamp(targetStationary + Custom.LerpMap(Vector2.Distance(crit.mainBodyChunk.lastPos, crit.mainBodyChunk.pos), 1f, 12f, 1f / 180f, -0.0125f), 0f, 1f);
		if (!Custom.DistLess(crit.mainBodyChunk.pos, lastTargetPos, 200f))
		{
			lastTargetPos = crit.mainBodyChunk.pos;
			targetStationary = Mathf.Max(0f, targetStationary - 0.25f);
		}
		else
		{
			lastTargetPos = Custom.MoveTowards(lastTargetPos, crit.mainBodyChunk.pos, 2f);
			targetStationary = Mathf.Max(0f, targetStationary - Mathf.InverseLerp(0f, 200f, Vector2.Distance(lastTargetPos, crit.mainBodyChunk.pos)) * 0.1f);
		}
		float num = RealizedCreatureInterest(crit);
		float num2 = (Mathf.Pow(targetStationary, Mathf.Lerp(2f, 0.1f, num)) + Mathf.InverseLerp(40f, Mathf.Lerp(400f, 70f, num), overseer.stationaryCounter) + Mathf.Lerp(bringUpLens, 0.5f, 0.2f) + Mathf.Lerp(num, randomBringUpLensBonus, 0.5f)) / 4f;
		if (overseer.mode == Overseer.Mode.Zipping && creature.abstractAI.destination.room == overseer.room.abstractRoom.index)
		{
			bringUpLens = Mathf.Max(bringUpLens - 0.025f);
		}
		else
		{
			if (overseer.mode == Overseer.Mode.SittingInWall)
			{
				num2 *= 0.49f;
			}
			bringUpLens = Mathf.Clamp(bringUpLens + Mathf.Lerp(-1f, 1f, num2) / 40f, 0f, 1f);
		}
		if (UnityEngine.Random.value < 1f / 160f)
		{
			randomBringUpLensBonus = UnityEngine.Random.value;
		}
	}

	public void UpdateZipMatrix()
	{
		if (zipPathingMatrix == null)
		{
			ResetZipPathingMatrix(overseer.rootTile);
		}
		if (addToPathingList.Count <= 0)
		{
			return;
		}
		for (int num = overseer.room.game.pathfinderResourceDivider.RequesAccesibilityUpdates((overseer.mode == Overseer.Mode.SittingInWall) ? 16 : 8) * 2; num >= 0; num--)
		{
			if (addToPathingList.Count > 0)
			{
				IntVector2 intVector = addToPathingList[0];
				addToPathingList.RemoveAt(0);
				float zipPathMatrixCell = GetZipPathMatrixCell(intVector);
				for (int i = 0; i < 8; i++)
				{
					if (GetZipPathMatrixCell(intVector + Custom.eightDirections[i]) != float.MaxValue)
					{
						continue;
					}
					float num2 = 1f;
					if (!overseer.room.GetTile(intVector + Custom.eightDirections[i]).Solid)
					{
						num2 = ((overseer.room.GetTile(intVector + Custom.eightDirections[i]).verticalBeam || overseer.room.GetTile(intVector + Custom.eightDirections[i]).horizontalBeam) ? 5f : ((!overseer.room.GetTile(intVector + Custom.eightDirections[i]).wallbehind) ? 1000f : ((overseer.room.GetTile(intVector + Custom.eightDirections[i]).shortCut <= 0) ? 100f : 2f)));
					}
					else if (overseer.room.GetTile(intVector + Custom.eightDirections[i]).shortCut > 0)
					{
						num2 = 0.001f;
					}
					else
					{
						bool flag = true;
						for (int j = 0; j < 4 && flag; j++)
						{
							flag = overseer.room.GetTile(intVector + Custom.eightDirections[i] + Custom.eightDirections[j]).Solid;
						}
						num2 = (flag ? 1.5f : 1f);
					}
					num2 *= Custom.eightDirections[i].ToVector2().magnitude;
					float num3 = zipPathMatrixCell + num2 * (1f + UnityEngine.Random.value);
					SetZipPathMatrixCell(intVector + Custom.eightDirections[i], num3);
					if (addToPathingList.Count == 0 || num3 > GetZipPathMatrixCell(addToPathingList[addToPathingList.Count - 1]))
					{
						addToPathingList.Add(intVector + Custom.eightDirections[i]);
						continue;
					}
					int num4 = addToPathingList.Count - 1;
					while (num4 > 0 && num3 < GetZipPathMatrixCell(addToPathingList[num4 - 1]))
					{
						num4--;
					}
					addToPathingList.Insert(num4, intVector + Custom.eightDirections[i]);
				}
			}
		}
	}

	public void UpdateTempHoverPosition()
	{
		IntVector2 tilePosition = overseer.room.GetTilePosition(overseer.room.MiddleOfTile(overseer.hoverTile) + Custom.RNV() * (UnityEngine.Random.value * 400f));
		IntVector2? intVector = FindRootTileForHoverPos(tempHoverTile);
		intVector = FindRootTileForHoverPos(tilePosition);
		if (intVector.HasValue && GetZipPathMatrixCell(intVector.Value) >= 0f && GetZipPathMatrixCell(intVector.Value) < float.MaxValue && HoverScoreOfTile(tilePosition) < HoverScoreOfTile(tempHoverTile))
		{
			tempHoverTile = tilePosition;
		}
		float num = 200f;
		if (overseer.mode == Overseer.Mode.SittingInWall)
		{
			num = 10f;
		}
		else if (overseer.hologram != null)
		{
			if (overseer.hologram.overseerSitStill)
			{
				num = 300f;
			}
			else if (addToPathingList.Count < 1)
			{
				num = 30f;
			}
		}
		if (tempHoverTile.FloatDist(overseer.rootTile) <= 6f * overseer.size && HoverScoreOfTile(tempHoverTile) < HoverScoreOfTile(overseer.hoverTile))
		{
			overseer.hoverTile = tempHoverTile;
		}
		else
		{
			if ((!(overseer.extended > 0.5f) && !(overseer.mode == Overseer.Mode.SittingInWall)) || !(overseer.mode != Overseer.Mode.Withdrawing) || !(tempHoverTile.FloatDist(overseer.hoverTile) > 3f * overseer.size) || !(HoverScoreOfTile(tempHoverTile) + num < HoverScoreOfTile(overseer.hoverTile)))
			{
				return;
			}
			intVector = FindRootTileForHoverPos(tempHoverTile);
			if (intVector.HasValue && GetZipPathMatrixCell(intVector.Value) >= 0f && GetZipPathMatrixCell(intVector.Value) < float.MaxValue)
			{
				avoidPositions.Add(overseer.hoverTile);
				if (avoidPositions.Count > 10)
				{
					avoidPositions.RemoveAt(0);
				}
				overseer.FindZipPath(intVector.Value, tempHoverTile);
				if (overseer.mode == Overseer.Mode.SittingInWall)
				{
					overseer.SwitchModes(Overseer.Mode.Zipping);
					return;
				}
				overseer.afterWithdrawMode = Overseer.Mode.Zipping;
				overseer.SwitchModes(Overseer.Mode.Withdrawing);
			}
		}
	}

	public bool DoIWantToTalkToThisOverSeer(Overseer other)
	{
		if (overseer.conversationDelay == 0 && other.conversationDelay == 0)
		{
			return overseer.lastConversationPartner != other;
		}
		return false;
	}

	public float HoverScoreOfTile(IntVector2 testTile)
	{
		if (testTile.x < 0 || testTile.y < 0 || testTile.x >= overseer.room.TileWidth || testTile.y >= overseer.room.TileHeight)
		{
			return float.MaxValue;
		}
		if (overseer.room.GetTile(testTile).Solid)
		{
			return float.MaxValue;
		}
		if (overseer.room.aimap.getTerrainProximity(testTile) > (int)(6f * overseer.size))
		{
			return float.MaxValue;
		}
		float num = 0f;
		if (overseer.hologram != null)
		{
			num += Mathf.Abs(100f - Vector2.Distance(overseer.room.MiddleOfTile(testTile), overseer.room.MiddleOfTile(overseer.hologram.displayTile))) * 2f;
			if (Custom.DistLess(overseer.room.MiddleOfTile(testTile), overseer.room.MiddleOfTile(overseer.hologram.displayTile), 500f))
			{
				if (overseer.room.VisualContact(testTile, overseer.hologram.displayTile))
				{
					num -= 500f;
				}
			}
			else
			{
				num += 1000f;
			}
			num = overseer.hologram.InfluenceHoverScoreOfTile(testTile, num);
		}
		else
		{
			num += Mathf.Abs(300f - Vector2.Distance(overseer.room.MiddleOfTile(testTile), lookAt));
			if (Custom.DistLess(overseer.room.MiddleOfTile(testTile), lookAt, 1000f) && overseer.room.VisualContact(testTile, overseer.room.GetTilePosition(lookAt)))
			{
				num -= 100f;
			}
			for (int i = 0; i < avoidPositions.Count; i++)
			{
				if (avoidPositions[i].FloatDist(testTile) < 15f)
				{
					num += Custom.LerpMap(avoidPositions[i].FloatDist(testTile), 10f, 15f, 50f, 0f);
				}
			}
		}
		for (int j = 0; j < overseer.room.abstractRoom.creatures.Count; j++)
		{
			if (overseer.room.abstractRoom.creatures[j].realizedCreature == null || overseer.room.abstractRoom.creatures[j].realizedCreature.room != overseer.room)
			{
				continue;
			}
			if (overseer.room.abstractRoom.creatures[j].creatureTemplate.type != CreatureTemplate.Type.Overseer)
			{
				if (!overseer.room.abstractRoom.creatures[j].creatureTemplate.smallCreature && !overseer.room.abstractRoom.creatures[j].realizedCreature.dead && Custom.DistLess(overseer.room.MiddleOfTile(testTile), overseer.room.abstractRoom.creatures[j].realizedCreature.DangerPos, scaredDistance + 10f))
				{
					return float.MaxValue;
				}
				num += Custom.LerpMap(Vector2.Distance(overseer.room.MiddleOfTile(testTile), overseer.room.abstractRoom.creatures[j].realizedCreature.DangerPos), 40f, Mathf.Clamp(overseer.room.abstractRoom.creatures[j].creatureTemplate.bodySize * 600f, 60f, 800f), overseer.room.abstractRoom.creatures[j].creatureTemplate.bodySize * 100f, 0f);
			}
			else if (overseer.room.abstractRoom.creatures[j] != overseer.abstractCreature && !DoIWantToTalkToThisOverSeer(overseer.room.abstractRoom.creatures[j].realizedCreature as Overseer))
			{
				num += Custom.LerpMap((overseer.room.abstractRoom.creatures[j].realizedCreature as Overseer).hoverTile.FloatDist(testTile), 0f, 3f, 250f, 0f);
				num += Custom.LerpMap((overseer.room.abstractRoom.creatures[j].realizedCreature as Overseer).nextHoverTile.FloatDist(testTile), 0f, 3f, 250f, 0f);
			}
		}
		if (overseer.room.aimap.getAItile(testTile).narrowSpace)
		{
			num += 200f;
		}
		num -= (float)overseer.room.aimap.getTerrainProximity(testTile) * 10f;
		if (testTile.y <= overseer.room.defaultWaterLevel)
		{
			num += 10000f;
		}
		if (overseer.SandboxOverseer && !overseer.editCursor.menuMode)
		{
			num += Mathf.Max(0f, Vector2.Distance(overseer.room.MiddleOfTile(testTile), overseer.editCursor.pos) - 250f) * 30f;
		}
		if (ModManager.MMF && overseer.PlayerGuide && (overseer.abstractCreature.abstractAI as OverseerAbstractAI).goToPlayer && overseer.AI.communication.GuideState.handHolding > 0.5f && overseer.AI.communication.player != null && overseer.room != null)
		{
			int num2 = overseer.room.CameraViewingPoint(overseer.room.MiddleOfTile(testTile));
			if (num2 < 0)
			{
				num2 = 0;
			}
			if (num2 >= overseer.room.cameraPositions.Length)
			{
				num2 = overseer.room.cameraPositions.Length - 1;
			}
			num = Mathf.Pow(Vector2.Distance(overseer.room.cameraPositions[num2], overseer.AI.communication.player.firstChunk.pos), 4f);
		}
		if (ModManager.MSC && overseer.abstractCreature.abstractAI != null && (overseer.abstractCreature.abstractAI as OverseerAbstractAI).safariOwner && (overseer.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature != null && (overseer.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature.realizedCreature != null)
		{
			int num3 = 0;
			float num4 = float.MaxValue;
			for (int k = 0; k < overseer.room.cameraPositions.Length; k++)
			{
				float num5 = Mathf.Pow(Vector2.Distance(overseer.room.cameraPositions[k], (overseer.abstractCreature.abstractAI as OverseerAbstractAI).targetCreature.realizedCreature.firstChunk.pos), 4f);
				if (num5 < num4)
				{
					num4 = num5;
					num3 = k;
				}
			}
			num = Custom.LerpMap(Vector2.Distance(overseer.room.MiddleOfTile(testTile), overseer.room.cameraPositions[num3]), 30000f, 120f, 4000000f, 0f);
		}
		if (tutorialBehavior != null)
		{
			num = tutorialBehavior.InfluenceHoverScoreOfTile(testTile, num);
		}
		return num;
	}

	public IntVector2? FindRootTileForHoverPos(IntVector2 testHoverPos)
	{
		IntVector2 intVector = testHoverPos;
		for (int i = 0; i < 15; i++)
		{
			int num = int.MaxValue;
			IntVector2 intVector2 = intVector;
			for (int j = 0; j < 8; j++)
			{
				if (overseer.room.aimap.getTerrainProximity(intVector + Custom.eightDirections[j]) < num)
				{
					intVector2 = intVector + Custom.eightDirections[j];
					num = overseer.room.aimap.getTerrainProximity(intVector + Custom.eightDirections[j]);
				}
			}
			if (intVector == intVector2)
			{
				return null;
			}
			intVector = intVector2;
			if (!overseer.room.GetTile(intVector).Solid)
			{
				continue;
			}
			bool flag = false;
			for (int k = 0; k < overseer.room.abstractRoom.creatures.Count; k++)
			{
				if (flag)
				{
					break;
				}
				if (overseer.room.abstractRoom.creatures[k].creatureTemplate.type == CreatureTemplate.Type.Overseer && overseer.room.abstractRoom.creatures[k] != overseer.abstractCreature && overseer.room.abstractRoom.creatures[k].realizedCreature != null && (overseer.room.abstractRoom.creatures[k].realizedCreature as Overseer).rootTile == intVector)
				{
					flag = true;
				}
			}
			if (flag)
			{
				return null;
			}
			return intVector;
		}
		return null;
	}

	public void ResetZipPathingMatrix(IntVector2 newCenter)
	{
		if (overseer == null || overseer.room == null)
		{
			return;
		}
		if (zipPathingMatrix == null)
		{
			zipPathingMatrix = new float[0, 0];
		}
		int num = 30;
		int num2 = Math.Max(0, newCenter.x - num);
		int num3 = Math.Max(0, newCenter.y - num);
		int num4 = Math.Min(overseer.room.TileWidth - 1, newCenter.x + num);
		int num5 = Math.Min(overseer.room.TileHeight - 1, newCenter.y + num);
		if (num4 - num2 != zipPathingMatrix.GetLength(0) || num5 - num3 != zipPathingMatrix.GetLength(1))
		{
			zipPathingMatrix = new float[Math.Max(1, num4 - num2), Math.Max(1, num5 - num3)];
		}
		zipPathMatrixOffset = new IntVector2(-num2, -num3);
		for (int i = 0; i < zipPathingMatrix.GetLength(0); i++)
		{
			for (int j = 0; j < zipPathingMatrix.GetLength(1); j++)
			{
				zipPathingMatrix[i, j] = float.MaxValue;
			}
		}
		addToPathingList = new List<IntVector2>();
		addToPathingList.Add(newCenter);
		SetZipPathMatrixCell(newCenter, 0f);
	}

	public void SetZipPathMatrixCell(IntVector2 intVec, float setValue)
	{
		SetZipPathMatrixCell(intVec.x, intVec.y, setValue);
	}

	public void SetZipPathMatrixCell(int x, int y, float setValue)
	{
		if (x >= 0 && x < overseer.room.TileWidth && y >= 0 && y < overseer.room.TileHeight && x + zipPathMatrixOffset.x >= 0 && x + zipPathMatrixOffset.x < zipPathingMatrix.GetLength(0) && y + zipPathMatrixOffset.y >= 0 && y + zipPathMatrixOffset.y < zipPathingMatrix.GetLength(1))
		{
			zipPathingMatrix[x + zipPathMatrixOffset.x, y + zipPathMatrixOffset.y] = setValue;
		}
	}

	public float GetZipPathMatrixCell(IntVector2 intVec)
	{
		return GetZipPathMatrixCell(intVec.x, intVec.y);
	}

	public float GetZipPathMatrixCell(int x, int y)
	{
		if (x < 0 || x >= overseer.room.TileWidth || y < 0 || y >= overseer.room.TileHeight)
		{
			return -1f;
		}
		if (x + zipPathMatrixOffset.x < 0 || x + zipPathMatrixOffset.x >= zipPathingMatrix.GetLength(0) || y + zipPathMatrixOffset.y < 0 || y + zipPathMatrixOffset.y >= zipPathingMatrix.GetLength(1))
		{
			return -1f;
		}
		return zipPathingMatrix[x + zipPathMatrixOffset.x, y + zipPathMatrixOffset.y];
	}

	private float LookAtAirPosScore(Vector2 testPos)
	{
		if (overseer.room.GetTile(testPos).Solid)
		{
			return float.MinValue;
		}
		IntVector2 tilePosition = overseer.room.GetTilePosition(testPos);
		float num = overseer.room.aimap.getAItile(tilePosition).visibility;
		for (int i = 0; i < lastLookAtAirPositions.Count; i++)
		{
			num -= Mathf.InverseLerp(300f, 10f, Vector2.Distance(testPos, lastLookAtAirPositions[i])) * 400f;
		}
		if (tilePosition.x < 0 || tilePosition.y < 0 || tilePosition.x >= overseer.room.TileWidth || tilePosition.y > overseer.room.TileHeight)
		{
			num -= 1000f;
		}
		return num;
	}

	private float RealizedCreatureInterest(Creature testCrit)
	{
		if (testCrit == null || testCrit.abstractCreature.pos.room != overseer.room.abstractRoom.index)
		{
			return float.MinValue;
		}
		float num = (overseer.abstractCreature.abstractAI as OverseerAbstractAI).HowInterestingIsCreature(testCrit.abstractCreature);
		num += 0.05f;
		if (Custom.DistLess(testCrit.DangerPos, overseer.mainBodyChunk.pos, 900f) && overseer.room.VisualContact(overseer.mainBodyChunk.pos, testCrit.DangerPos))
		{
			num *= Custom.LerpMap(Vector2.Distance(testCrit.mainBodyChunk.lastPos, testCrit.mainBodyChunk.pos), 2f, 14f, 1f, 3f);
		}
		return num * Custom.LerpMap(Vector2.Distance(overseer.rootPos, testCrit.DangerPos), 20f, 600f, 4f, 1f, 0.2f);
	}

	public void FlyingWeapon(Weapon weapon)
	{
		if (!Custom.DistLess(overseer.mainBodyChunk.pos, weapon.firstChunk.pos, 600f) || !overseer.room.VisualContact(overseer.mainBodyChunk.pos, weapon.firstChunk.pos))
		{
			return;
		}
		if (UnityEngine.Random.value < Mathf.InverseLerp(10f, 40f, overseer.stationaryCounter) * 0.75f && overseer.mode == Overseer.Mode.Watching && Custom.DistLess(overseer.mainBodyChunk.pos, weapon.firstChunk.pos + weapon.firstChunk.vel.normalized * 100f, 100f))
		{
			overseer.afterWithdrawMode = Overseer.Mode.SittingInWall;
			overseer.SwitchModes(Overseer.Mode.Withdrawing);
			if (overseer.PlayerGuide && weapon.thrownBy != null && (weapon.thrownClosestToCreature == null || weapon.thrownClosestToCreature == overseer))
			{
				if (weapon.thrownBy.Template.type == CreatureTemplate.Type.Slugcat)
				{
					bool flag = weapon is Spear;
					(creature.world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState.InfluenceLike(flag ? (-0.1f) : (-0.05f), creature.world.game.devToolsActive);
					(creature.world.game.session as StoryGameSession).saveState.miscWorldSaveData.playerGuideState.increaseLikeOnSave = false;
					if ((creature.abstractAI as OverseerAbstractAI).goToPlayer)
					{
						(creature.abstractAI as OverseerAbstractAI).playerGuideCounter /= (flag ? 5 : 2);
					}
				}
				else if (weapon.thrownBy.Template.type == CreatureTemplate.Type.Scavenger)
				{
					Custom.Log("player guide gets out b/c scavengers");
					(creature.abstractAI as OverseerAbstractAI).PlayerGuideGoAway(UnityEngine.Random.Range(1000, 3000));
				}
			}
		}
		if (lookAtFlyingWeapon == null || Vector2.Distance(overseer.mainBodyChunk.pos, weapon.firstChunk.pos) < Vector2.Distance(overseer.mainBodyChunk.pos, lookAtFlyingWeapon.firstChunk.pos))
		{
			lookAtFlyingWeapon = weapon;
		}
	}
}
