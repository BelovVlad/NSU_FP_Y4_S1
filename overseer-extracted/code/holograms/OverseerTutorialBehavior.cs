using System;
using System.Collections.Generic;
using System.IO;
using MoreSlugcats;
using OverseerHolograms;
using RWCustom;
using ScavTradeInstruction;
using UnityEngine;

public class OverseerTutorialBehavior : AIModule
{
	public class GateTutorial : InputInstruction.InputInstructionController
	{
		public RegionGate gate;

		public GateTutorial(InputInstruction instructionHologram, OverseerTutorialBehavior tutBehavior)
			: base(instructionHologram, tutBehavior)
		{
		}

		public override void Update()
		{
			bool flag = (base.player.room != null && base.player.room.regionGate != null && base.player.room.regionGate.MeetRequirement && base.player.room.world.rainCycle.TimeUntilRain >= 1600) || base.player.room == null;
			base.Update();
			instructionHologram.closeToPos = new Vector2(410f, 150f);
			instructionHologram.direction = new IntVector2(0, 1);
			instructionHologram.stillRelevant = flag && (base.player.room == null || !base.player.room.game.GetStorySession.saveState.deathPersistentSaveData.GateStandTutorial);
			instructionHologram.playerGhost.visible = flag && base.player.bodyChunks[1].pos.x < 390f;
			if (instructionHologram.stillRelevant)
			{
				if (Custom.Dist(base.overseer.rootPos, instructionHologram.closeToPos) > 300f)
				{
					base.overseer.ZipToPosition(instructionHologram.closeToPos + Custom.RNV() * 120f);
				}
				(base.overseer.abstractCreature.abstractAI as OverseerAbstractAI).freezeStandardRoamingOnTheseFrames = 10;
			}
		}

		public static bool InZone(Vector2 testPos)
		{
			return testPos.x >= 150f;
		}
	}

	public class BasicInputInstruction : InputInstruction
	{
		public BasicInputInstruction(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			addRedCross = false;
			AllPartsAdded();
		}

		public override float DisplayPosScore(IntVector2 testPos)
		{
			float num = base.DisplayPosScore(testPos);
			if (!directionOnly && room.readyForAI)
			{
				num -= (float)Mathf.Min(room.aimap.getTerrainProximity(testPos + new IntVector2(-10, 0)), 5) * 50f;
			}
			return num;
		}
	}

	public abstract class InputInstruction : OverseerHologram
	{
		public abstract class InputInstructionController
		{
			public InputInstruction instructionHologram;

			public OverseerTutorialBehavior tutBehavior;

			public Player player => instructionHologram.communicateWith as Player;

			public Room room => instructionHologram.room;

			public Overseer overseer => instructionHologram.overseer;

			public InputInstructionController(InputInstruction instructionHologram, OverseerTutorialBehavior tutBehavior)
			{
				this.instructionHologram = instructionHologram;
				this.tutBehavior = tutBehavior;
			}

			public virtual void Update()
			{
			}
		}

		public class RedCross : HologramPart
		{
			protected override Color GetToColor => new Color(1f, 0f, 0f);

			public RedCross(OverseerHologram hologram, int firstSprite, bool small)
				: base(hologram, firstSprite)
			{
				List<Vector2> list = new List<Vector2>();
				for (int i = 0; i < 4; i++)
				{
					Vector2 vector = Custom.DegToVec(45f + 90f * (float)i);
					list.Add(vector * 5f + Custom.PerpendicularVector(vector) * 5f);
					list.Add(vector * 60f + Custom.PerpendicularVector(vector) * 5f);
					list.Add(vector * 60f - Custom.PerpendicularVector(vector) * 5f);
				}
				for (int j = 0; j < list.Count; j++)
				{
					list[j] *= (small ? 0.4f : 1f);
				}
				AddClosed3DPolygon(list, 5f);
			}

			public override void Update()
			{
				base.Update();
				if (hologram is SwitchInstruction)
				{
					offset = (hologram as SwitchInstruction).socket.offset;
				}
				if (hologram is GamePadInstruction)
				{
					offset = (hologram as GamePadInstruction).socket.offset;
				}
				else if (hologram is KeyBoardInstruction)
				{
					offset = ((hologram as KeyBoardInstruction).Up.offset + (hologram as KeyBoardInstruction).Down.offset) / 2f;
				}
			}
		}

		public IntVector2 direction;

		public bool showPickup;

		public bool showJump;

		public bool showThrow;

		public bool directionOnly;

		public bool hideInputs;

		public Vector2 closeToPos;

		public InputInstructionController controller;

		public PlayerGhost playerGhost;

		public WaitMeter waitMeter;

		public RedCross dontTouchInputCross;

		public bool addRedCross;

		public InputInstruction(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			if (overseer.AI.tutorialBehavior == null && message != Message.InWorldSuperJump && message != Message.PickupObject && message != Message.ScavengerTrade)
			{
				stillRelevant = false;
			}
			else if (message == Message.GetUpOnFirstBox)
			{
				controller = new GetUpOnFirstBox(this, overseer.AI.tutorialBehavior);
			}
			else if (message == Message.ClimbPole)
			{
				controller = new ClimbPole(this, overseer.AI.tutorialBehavior);
				playerGhost = new PlayerGhost(this, totalSprites, "playerStandingSymbol", new Vector2(524f, 160f));
				AddPart(playerGhost);
			}
			else if (message == Message.SuperJump)
			{
				controller = new SuperJump(this, overseer.AI.tutorialBehavior, inTuturialSection: true);
				playerGhost = new PlayerGhost(this, totalSprites, "playerCrouchingSymbol", new Vector2(316f, 460f));
				AddPart(playerGhost);
				waitMeter = new WaitMeter(this);
			}
			else if (message == Message.EatInstruction)
			{
				controller = new Eat(this, overseer.AI.tutorialBehavior);
				waitMeter = new WaitMeter(this);
				addRedCross = true;
			}
			else if (message == Message.InWorldSuperJump)
			{
				controller = new SuperJump(this, overseer.AI.tutorialBehavior, inTuturialSection: false);
				playerGhost = new PlayerGhost(this, totalSprites, "playerCrouchingSymbol", overseer.firstChunk.pos);
				AddPart(playerGhost);
				waitMeter = new WaitMeter(this);
			}
			else if (message == Message.PickupObject)
			{
				controller = new PickupObjectInputInstructionController(this, overseer.AI.tutorialBehavior);
			}
			else if (message == Message.ScavengerTrade)
			{
				controller = new ScavTradeInputInstructionController(this, overseer.AI.tutorialBehavior);
			}
			else if (ModManager.MMF && MMF.cfgExtraTutorials.Value && message == MMFEnums.OverseerHologramMessage.TutorialGate)
			{
				controller = new GateTutorial(this, overseer.AI.tutorialBehavior);
				playerGhost = new PlayerGhost(this, totalSprites, "playerStandingSymbol", new Vector2(410f, 140f));
				AddPart(playerGhost);
			}
		}

		protected void AllPartsAdded()
		{
			if (addRedCross)
			{
				dontTouchInputCross = new RedCross(this, totalSprites, this is GamePadInstruction);
				dontTouchInputCross.visible = false;
				AddPart(dontTouchInputCross);
			}
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			if (controller != null)
			{
				controller.Update();
			}
			if (waitMeter != null)
			{
				waitMeter.Update();
			}
		}

		public override float DisplayPosScore(IntVector2 testPos)
		{
			return base.DisplayPosScore(testPos) + Mathf.Abs(200f - Vector2.Distance(room.MiddleOfTile(testPos), communicateWith.DangerPos)) / 2f + Vector2.Distance(room.MiddleOfTile(testPos), closeToPos);
		}
	}

	public class GetUpOnFirstBox : InputInstruction.InputInstructionController
	{
		public GetUpOnFirstBox(InputInstruction instructionHologram, OverseerTutorialBehavior tutBehavior)
			: base(instructionHologram, tutBehavior)
		{
		}

		public override void Update()
		{
			base.Update();
			instructionHologram.closeToPos = new Vector2(1800f, 300f);
			if (!base.player.standing)
			{
				instructionHologram.direction = new IntVector2(0, 1);
				instructionHologram.showJump = false;
			}
			else
			{
				instructionHologram.direction = new IntVector2(0, 0);
				instructionHologram.showJump = true;
			}
			instructionHologram.stillRelevant = !tutBehavior.playerHasJumpedOverBox && InZone(base.player.bodyChunks[1].pos);
			if (base.player.bodyChunks[1].pos.x > 1836f && base.player.bodyChunks[1].pos.y > 174f && base.player.bodyChunks[1].ContactPoint.y < 0)
			{
				Custom.Log("Yay! Box cleared!");
				tutBehavior.playerHasJumpedOverBox = true;
			}
		}

		public static bool InZone(Vector2 testPos)
		{
			if (testPos.x > 1680f)
			{
				return testPos.x < 1836f;
			}
			return false;
		}
	}

	public class ClimbPole : InputInstruction.InputInstructionController
	{
		public ClimbPole(InputInstruction instructionHologram, OverseerTutorialBehavior tutBehavior)
			: base(instructionHologram, tutBehavior)
		{
			Custom.Log("climb pole");
		}

		public override void Update()
		{
			base.Update();
			instructionHologram.closeToPos = new Vector2(570f, 400f);
			instructionHologram.direction = new IntVector2(0, 1);
			instructionHologram.stillRelevant = !tutBehavior.playerHasClimbedPole && InZone(base.player.bodyChunks[1].pos);
			if (base.player.bodyChunks[1].pos.y > 280f && base.player.animation == Player.AnimationIndex.ClimbOnBeam)
			{
				Custom.Log("Yay! Pole climbed!");
				tutBehavior.playerHasClimbedPole = true;
			}
			instructionHologram.playerGhost.visible = base.player.bodyChunks[1].pos.y < 200f && base.player.animation != Player.AnimationIndex.ClimbOnBeam;
		}

		public static bool InZone(Vector2 testPos)
		{
			if (testPos.x > 360f)
			{
				return testPos.x < 660f;
			}
			return false;
		}
	}

	public class Eat : InputInstruction.InputInstructionController
	{
		public class FoodArrow : OverseerHologram.HologramPart
		{
			public FoodArrow(OverseerHologram hologram, int firstSprite)
				: base(hologram, firstSprite)
			{
				float num = 5f;
				float num2 = 10f;
				float num3 = 5f;
				AddLine(new Vector3(0f - num, num2, 0f - num3), new Vector3(num, num2, 0f - num3));
				AddLine(new Vector3(num, num2, 0f - num3), new Vector3(num, num2, num3));
				AddLine(new Vector3(num, num2, num3), new Vector3(0f - num, num2, num3));
				AddLine(new Vector3(0f - num, num2, num3), new Vector3(0f - num, num2, 0f - num3));
				for (int num4 = lines.Count - 1; num4 >= 0; num4--)
				{
					AddLine(lines[num4].A, new Vector3(0f, 0f - num2, 0f));
				}
			}

			public override void Update()
			{
				base.Update();
			}
		}

		public FoodArrow[] foodArrows;

		public int stillCounter;

		public int movingCounter;

		public int tellPlayerToStayStillCounter;

		private bool showSlowButtonPress;

		public Eat(InputInstruction instructionHologram, OverseerTutorialBehavior tutBehavior)
			: base(instructionHologram, tutBehavior)
		{
			Custom.Log("Eat");
			foodArrows = new FoodArrow[4];
			for (int i = 0; i < foodArrows.Length; i++)
			{
				foodArrows[i] = new FoodArrow(instructionHologram, instructionHologram.totalSprites);
				foodArrows[i].visible = false;
				instructionHologram.AddPart(foodArrows[i]);
			}
		}

		public override void Update()
		{
			instructionHologram.waitMeter.blinkWhenFull = false;
			if (instructionHologram is SwitchInstruction)
			{
				(instructionHologram as SwitchInstruction).PickUp.timeUp = (showSlowButtonPress ? 4 : 10);
				(instructionHologram as SwitchInstruction).PickUp.timeDown = (showSlowButtonPress ? 40 : 10);
			}
			else if (instructionHologram is KeyBoardInstruction)
			{
				(instructionHologram as KeyBoardInstruction).PickUp.timeUp = (showSlowButtonPress ? 4 : 10);
				(instructionHologram as KeyBoardInstruction).PickUp.timeDown = (showSlowButtonPress ? 40 : 10);
			}
			else if (instructionHologram is GamePadInstruction)
			{
				(instructionHologram as GamePadInstruction).PickUp.timeUp = (showSlowButtonPress ? 4 : 10);
				(instructionHologram as GamePadInstruction).PickUp.timeDown = (showSlowButtonPress ? 40 : 10);
			}
			if (base.room.abstractRoom.name == "SU_A44")
			{
				instructionHologram.closeToPos = new Vector2(480f, 330f);
			}
			else if (base.player.mainBodyChunk.pos.x > 500f)
			{
				instructionHologram.closeToPos = new Vector2(330f, 250f);
			}
			else
			{
				instructionHologram.closeToPos = new Vector2(850f, 250f);
			}
			int num = 0;
			List<PhysicalObject> list = new List<PhysicalObject>();
			PhysicalObject physicalObject = null;
			for (int i = 0; i < base.room.physicalObjects.Length; i++)
			{
				for (int j = 0; j < base.room.physicalObjects[i].Count; j++)
				{
					if (base.room.physicalObjects[i][j] != null && base.room.physicalObjects[i][j] is IPlayerEdible && base.room.physicalObjects[i][j].room == base.room)
					{
						num++;
						if (base.room.physicalObjects[i][j].grabbedBy.Count == 0 && (!(base.room.physicalObjects[i][j] is Fly) || (base.room.physicalObjects[i][j] as Fly).movMode != Fly.MovementMode.Burrow))
						{
							list.Add(base.room.physicalObjects[i][j]);
						}
						else if (base.room.physicalObjects[i][j].grabbedBy.Count > 0 && base.room.physicalObjects[i][j].grabbedBy[0].grabber is Player)
						{
							physicalObject = base.room.physicalObjects[i][j];
						}
					}
				}
			}
			if (base.room.abstractRoom.name == "SU_A44")
			{
				tutBehavior.availablefruitInFruitRoom = num - 1;
			}
			else if (base.room.abstractRoom.name == "SU_A42")
			{
				tutBehavior.batsInBatRoom = num;
			}
			for (int k = 0; k < foodArrows.Length; k++)
			{
				if (k < list.Count && physicalObject == null)
				{
					foodArrows[k].visible = true;
					foodArrows[k].offset = list[k].firstChunk.pos + new Vector2(0f, 20f) - instructionHologram.pos;
				}
				else
				{
					foodArrows[k].visible = false;
				}
			}
			instructionHologram.stillRelevant = physicalObject != null || base.overseer.AI.tutorialBehavior.EatInstructionRelevant();
			if (!instructionHologram.stillRelevant)
			{
				Custom.Log("eat no longer relevant!");
			}
			instructionHologram.waitMeter.Update();
			instructionHologram.hideInputs = true;
			instructionHologram.showPickup = false;
			instructionHologram.showJump = false;
			if (base.player.input[0].x == 0 && base.player.input[0].y == 0 && !base.player.input[0].jmp)
			{
				stillCounter++;
				movingCounter--;
			}
			else
			{
				movingCounter++;
				stillCounter--;
			}
			stillCounter = Custom.IntClamp(stillCounter, 0, 60);
			movingCounter = Custom.IntClamp(movingCounter, 0, 60);
			bool flag = false;
			if (physicalObject != null && base.overseer.AI.tutorialBehavior != null && base.overseer.AI.tutorialBehavior.player != null)
			{
				instructionHologram.overseerSitStill = true;
				instructionHologram.hideInputs = false;
				if (stillCounter > 30)
				{
					instructionHologram.waitMeter.visible = true;
					instructionHologram.waitMeter.offset = base.overseer.AI.tutorialBehavior.player.mainBodyChunk.pos - instructionHologram.pos;
					instructionHologram.waitMeter.filled = Mathf.InverseLerp(40f, 10f, base.overseer.AI.tutorialBehavior.player.eatCounter);
					instructionHologram.showPickup = !instructionHologram.dontTouchInputCross.visible;
					showSlowButtonPress = true;
					if (stillCounter > 50 && movingCounter < 10 && tellPlayerToStayStillCounter < 10)
					{
						instructionHologram.dontTouchInputCross.visible = false;
					}
				}
				else if (movingCounter > 30)
				{
					instructionHologram.waitMeter.visible = false;
					instructionHologram.showPickup = false;
					if (movingCounter > 55)
					{
						flag = true;
						if (tellPlayerToStayStillCounter >= 40)
						{
							instructionHologram.dontTouchInputCross.visible = true;
						}
					}
				}
			}
			else
			{
				instructionHologram.waitMeter.visible = false;
				if (physicalObject == null && base.room.abstractRoom.name == "SU_A44")
				{
					showSlowButtonPress = false;
					instructionHologram.hideInputs = false;
					instructionHologram.showPickup = true;
					instructionHologram.showJump = true;
					if (instructionHologram is SwitchInstruction)
					{
						if (Math.Abs((instructionHologram as SwitchInstruction).PickUp.counter - (instructionHologram as SwitchInstruction).Jump.counter) < 5)
						{
							(instructionHologram as SwitchInstruction).Jump.counter = 0;
						}
					}
					else if (instructionHologram is KeyBoardInstruction)
					{
						if (Math.Abs((instructionHologram as KeyBoardInstruction).PickUp.counter - (instructionHologram as KeyBoardInstruction).Jump.counter) < 5)
						{
							(instructionHologram as KeyBoardInstruction).Jump.counter = 0;
						}
					}
					else if (instructionHologram is GamePadInstruction && Math.Abs((instructionHologram as GamePadInstruction).PickUp.counter - (instructionHologram as GamePadInstruction).Jump.counter) < 5)
					{
						(instructionHologram as GamePadInstruction).Jump.counter = 0;
					}
				}
				instructionHologram.waitMeter.visible = false;
				instructionHologram.overseerSitStill = false;
				instructionHologram.dontTouchInputCross.visible = false;
			}
			if (flag)
			{
				tellPlayerToStayStillCounter++;
			}
			else
			{
				tellPlayerToStayStillCounter--;
			}
			tellPlayerToStayStillCounter = Custom.IntClamp(tellPlayerToStayStillCounter, 0, 40);
		}
	}

	public class SuperJump : InputInstruction.InputInstructionController
	{
		public int inPositionCounter;

		public bool moveKeysUp;

		public bool inTuturialSection;

		public int jumpDirection;

		public SuperJump(InputInstruction instructionHologram, OverseerTutorialBehavior tutBehavior, bool inTuturialSection)
			: base(instructionHologram, tutBehavior)
		{
			this.inTuturialSection = inTuturialSection;
			Custom.Log("new super jump", inTuturialSection.ToString());
			if (inTuturialSection)
			{
				jumpDirection = 1;
			}
		}

		public override void Update()
		{
			base.Update();
			if (inTuturialSection && tutBehavior.superJumpAttemptTime > 0 && inPositionCounter < 10)
			{
				tutBehavior.superJumpAttemptTime++;
			}
			if (instructionHologram is SwitchInstruction)
			{
				(instructionHologram as SwitchInstruction).Jump.timeUp = 4;
				(instructionHologram as SwitchInstruction).Jump.timeDown = 40;
			}
			else if (instructionHologram is KeyBoardInstruction)
			{
				(instructionHologram as KeyBoardInstruction).Jump.timeUp = 4;
				(instructionHologram as KeyBoardInstruction).Jump.timeDown = 40;
			}
			else if (instructionHologram is GamePadInstruction)
			{
				(instructionHologram as GamePadInstruction).Jump.timeUp = 4;
				(instructionHologram as GamePadInstruction).Jump.timeDown = 40;
				(instructionHologram as GamePadInstruction).partsRemainVisible[2] = Math.Max((instructionHologram as GamePadInstruction).partsRemainVisible[2], 5);
			}
			if (!moveKeysUp && instructionHologram is KeyBoardInstruction)
			{
				for (int i = 0; i < (instructionHologram as KeyBoardInstruction).keys.Length; i++)
				{
					(instructionHologram as KeyBoardInstruction).keys[i].offset.y += 50f;
				}
				moveKeysUp = true;
			}
			if (inTuturialSection)
			{
				instructionHologram.closeToPos = new Vector2(480f, 540f);
				instructionHologram.stillRelevant = instructionHologram.stillRelevant && !tutBehavior.playerHasMadeSuperJump && InZone(base.player.bodyChunks[1].pos);
				if (base.player.bodyChunks[1].pos.x > 430f && base.player.bodyChunks[1].pos.y > 415f && base.player.bodyChunks[1].ContactPoint.y < 0)
				{
					Custom.Log("Yay! Superjump done!");
					tutBehavior.playerHasMadeSuperJump = true;
				}
			}
			else if (base.overseer.AI.communication != null && base.overseer.AI.communication.inputInstruction != null)
			{
				InputInstructionTrigger inputInstruction = base.overseer.AI.communication.inputInstruction;
				instructionHologram.stillRelevant = instructionHologram.stillRelevant && !inputInstruction.completed;
				PlacedObject placedObject = (inputInstruction as SuperJumpInstruction).placedObject;
				jumpDirection = (int)Mathf.Sign((placedObject.data as PlacedObject.QuadObjectData).handles[0].x);
				instructionHologram.closeToPos = placedObject.pos + new Vector2(0f, 20f);
				instructionHologram.playerGhost.roomPosition = placedObject.pos;
				instructionHologram.playerGhost.scaleX = jumpDirection;
				if (Custom.DistLess(base.player.bodyChunks[0].pos, placedObject.pos + (placedObject.data as PlacedObject.QuadObjectData).handles[0], 50f))
				{
					inputInstruction.completed = true;
					base.overseer.AI.communication.InWorldInputInstructionCompleted(inputInstruction);
				}
			}
			else
			{
				instructionHologram.stillRelevant = false;
			}
			instructionHologram.direction = new IntVector2(0, 0);
			instructionHologram.showJump = false;
			instructionHologram.hideInputs = false;
			bool flag = false;
			if (Custom.DistLess((base.player.bodyChunks[0].pos + base.player.bodyChunks[1].pos) / 2f, instructionHologram.playerGhost.roomPosition.Value, 30f))
			{
				instructionHologram.playerGhost.visible = false;
				instructionHologram.hideInputs = false;
				if (inTuturialSection)
				{
					if (tutBehavior.superJumpAttemptTime == 0)
					{
						tutBehavior.superJumpAttemptTime++;
					}
					else if (tutBehavior.superJumpAttemptTime > 1400)
					{
						tutBehavior.TutorialText("Briefly tap DOWN to crouch", 0, 200, hideHud: false);
						tutBehavior.TutorialText("When crouching, hold the JUMP button without giving any other input", 0, 280, hideHud: false);
						tutBehavior.superJumpAttemptTime = -1;
					}
				}
				if (base.player.standing)
				{
					instructionHologram.direction = new IntVector2(0, -1);
				}
				else if (base.player.mainBodyChunk.pos.x < base.player.bodyChunks[1].pos.x != jumpDirection < 0)
				{
					instructionHologram.direction = new IntVector2(jumpDirection, 0);
				}
				else
				{
					flag = base.player.input[0].x == 0 && base.player.input[0].y == 0 && base.player.input[0].jmp && !base.player.input[0].pckp && !base.player.input[0].thrw;
					instructionHologram.waitMeter.visible = true;
					if (inPositionCounter < 80)
					{
						instructionHologram.showJump = true;
					}
				}
			}
			else
			{
				instructionHologram.playerGhost.visible = true;
				instructionHologram.hideInputs = true;
				instructionHologram.waitMeter.visible = false;
			}
			if (flag)
			{
				inPositionCounter++;
			}
			else
			{
				inPositionCounter = 0;
			}
			if (inTuturialSection && inPositionCounter < 60 && !ModManager.MMF)
			{
				base.player.superLaunchJump = 0;
			}
			instructionHologram.waitMeter.offset = (base.player.bodyChunks[0].pos + base.player.bodyChunks[1].pos) / 2f - instructionHologram.pos;
			instructionHologram.waitMeter.filled = Mathf.InverseLerp(0f, 80f, inPositionCounter);
			instructionHologram.directionOnly = !instructionHologram.waitMeter.visible;
		}

		public static bool InZone(Vector2 testPos)
		{
			return testPos.x < 505f;
		}
	}

	public abstract class ButtonOrKey : OverseerHologram.HologramPart
	{
		public bool pulsate;

		public int counter;

		public bool down;

		public int symbolSprite;

		public string symbol;

		public float symbolRotation;

		public int timeUp = 10;

		public int timeDown = 10;

		protected override Color GetToColor
		{
			get
			{
				if (down)
				{
					return new Color(1f, 1f, 1f);
				}
				return base.GetToColor;
			}
		}

		public ButtonOrKey(OverseerHologram hologram, int firstSprite)
			: base(hologram, firstSprite)
		{
			symbolSprite = totalSprites;
			totalSprites++;
		}

		public override void Update()
		{
			base.Update();
			if (pulsate)
			{
				counter--;
				if (counter < 1)
				{
					down = !down;
					counter = (down ? timeDown : timeUp);
				}
			}
			else
			{
				down = false;
				counter = 0;
			}
			transform = Custom.LerpAndTick(transform, down ? 1f : 0f, 0.14f, 0.125f);
		}

		public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
		{
			base.InitiateSprites(sLeaser, rCam);
			sLeaser.sprites[firstSprite + symbolSprite] = new FSprite(((this is KeyBoardKey) ? "key" : "button") + symbol + "A");
			sLeaser.sprites[firstSprite + symbolSprite].rotation = symbolRotation;
		}

		public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos, Vector2 partPos, Vector2 headPos, float useFade, float popOut, Color useColor)
		{
			base.DrawSprites(sLeaser, rCam, timeStacker, camPos, partPos, headPos, useFade, popOut, useColor);
			if (UnityEngine.Random.value > Mathf.InverseLerp(0.5f, 1f, useFade))
			{
				sLeaser.sprites[firstSprite + symbolSprite].isVisible = false;
				return;
			}
			sLeaser.sprites[firstSprite + symbolSprite].isVisible = true;
			Vector3 b = Custom.Vec3FromVec2(partPos, -5f + 10f * Mathf.Lerp(lastTransform, transform, timeStacker));
			b = Vector3.Lerp(headPos, b, popOut);
			b = hologram.ApplyDepthOnVector(b, rCam, camPos);
			sLeaser.sprites[firstSprite + symbolSprite].x = b.x;
			sLeaser.sprites[firstSprite + symbolSprite].y = b.y;
			sLeaser.sprites[firstSprite + symbolSprite].element = Futile.atlasManager.GetElementWithName(((this is KeyBoardKey) ? "key" : "button") + symbol + ((down || transform > 0.5f) ? "B" : "A"));
			sLeaser.sprites[firstSprite + symbolSprite].color = useColor;
		}
	}

	public class KeyBoardKey : ButtonOrKey
	{
		public KeyBoardKey(OverseerHologram hologram, int firstSprite)
			: base(hologram, firstSprite)
		{
			float num = 15f;
			float num2 = 3f;
			float num3 = 5f;
			AddClosed3DPolygon(new List<Vector2>
			{
				new Vector2(0f - num + num2, 0f - num),
				new Vector2(0f - num, 0f - num + num2),
				new Vector2(0f - num, num - num2),
				new Vector2(0f - num + num2, num),
				new Vector2(num - num2, num),
				new Vector2(num, num - num2),
				new Vector2(num, 0f - num + num2),
				new Vector2(num - num2, 0f - num)
			}, num3);
			for (int i = 0; i < lines.Count; i++)
			{
				if (lines[i].A.z < 0f)
				{
					lines[i].A = Custom.Vec3FromVec2(lines[i].A * 0.9f, lines[i].A.z);
					lines[i].A2 = Custom.Vec3FromVec2(lines[i].A2 * 0.9f, num3);
				}
				else
				{
					lines[i].A2 = Custom.Vec3FromVec2(lines[i].A2 * 1.1f, lines[i].A2.z);
				}
				if (lines[i].B.z < 0f)
				{
					lines[i].B = Custom.Vec3FromVec2(lines[i].B * 0.9f, lines[i].B.z);
					lines[i].B2 = Custom.Vec3FromVec2(lines[i].B2 * 0.9f, num3);
				}
				else
				{
					lines[i].B2 = Custom.Vec3FromVec2(lines[i].B2 * 1.1f, lines[i].B2.z);
				}
			}
		}

		public void MakeWider(float add)
		{
			for (int i = 0; i < lines.Count; i++)
			{
				if (lines[i].A.x < 0f)
				{
					lines[i].A.x -= add;
				}
				else
				{
					lines[i].A.x += add;
				}
				if (lines[i].A2.x < 0f)
				{
					lines[i].A2.x -= add;
				}
				else
				{
					lines[i].A2.x += add;
				}
				if (lines[i].B.x < 0f)
				{
					lines[i].B.x -= add;
				}
				else
				{
					lines[i].B.x += add;
				}
				if (lines[i].B2.x < 0f)
				{
					lines[i].B2.x -= add;
				}
				else
				{
					lines[i].B2.x += add;
				}
			}
		}
	}

	public class GamePadSilhouette : OverseerHologram.HologramPart
	{
		private Vector2 basePos;

		public GamePadSilhouette(GamePadInstruction hologram, int firstSprite, Options.ControlSetup.Preset controllerType)
			: base(hologram, firstSprite)
		{
			totalSprites += 4;
			offset = new Vector2(0f, -40f);
			if (controllerType == Options.ControlSetup.Preset.PS4DualShock)
			{
				basePos = new Vector2(15f, 6f);
			}
			else if (controllerType == Options.ControlSetup.Preset.PS5DualSense)
			{
				basePos = new Vector2(15f, 8f);
			}
			else
			{
				basePos = new Vector2(12f, 5f);
			}
			if (controllerType != Options.ControlSetup.Preset.PS5DualSense && controllerType != Options.ControlSetup.Preset.PS4DualShock)
			{
				List<Vector2> list = new List<Vector2>();
				for (int i = 0; i < 26; i++)
				{
					list.Add(default(Vector2));
				}
				List<Vector2> list2 = new List<Vector2>();
				if (controllerType == Options.ControlSetup.Preset.XBox)
				{
					list2.Add(new Vector2(22f, 7.25f));
					list2.Add(new Vector2(20f, 7.25f));
					list2.Add(new Vector2(15f, 6f));
					list2.Add(new Vector2(14f, 5.5f));
					list2.Add(new Vector2(11f, 3f));
					list2.Add(new Vector2(8f, 0f));
					list2.Add(new Vector2(2.5f, -0.5f));
					list2.Add(new Vector2(1f, 3f));
					list2.Add(new Vector2(0.5f, 6f));
					list2.Add(new Vector2(5f, 25f));
					list2.Add(new Vector2(9f, 30f));
					list2.Add(new Vector2(14f, 30f));
					list2.Add(new Vector2(19.5f, 27.5f));
				}
				else
				{
					list2.Add(new Vector2(22f, 11f));
					list2.Add(new Vector2(20f, 9f));
					list2.Add(new Vector2(15f, 10f));
					list2.Add(new Vector2(14f, 10f));
					list2.Add(new Vector2(11f, 3f));
					list2.Add(new Vector2(8f, 0f));
					list2.Add(new Vector2(5f, 0f));
					list2.Add(new Vector2(1f, 3f));
					list2.Add(new Vector2(0f, 6f));
					list2.Add(new Vector2(5f, 25f));
					list2.Add(new Vector2(9f, 30f));
					list2.Add(new Vector2(14f, 30f));
					list2.Add(new Vector2(16f, 28f));
				}
				for (int j = 0; j < list2.Count; j++)
				{
					list[j] = list2[j] + new Vector2(-25f, -15f);
					list[25 - j] = new Vector2(25f - list2[j].x, list2[j].y - 15f);
				}
				AddClosedPolygon(list);
			}
		}

		public override void Update()
		{
			base.Update();
		}

		public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
		{
			base.InitiateSprites(sLeaser, rCam);
			for (int i = 0; i < 4; i++)
			{
				sLeaser.sprites[firstSprite + i] = new FSprite("Circle4");
			}
		}

		public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos, Vector2 partPos, Vector2 headPos, float useFade, float popOut, Color useColor)
		{
			base.DrawSprites(sLeaser, rCam, timeStacker, camPos, partPos, headPos, useFade, popOut, useColor);
			if (UnityEngine.Random.value > Mathf.InverseLerp(0.5f, 1f, useFade))
			{
				for (int i = 0; i < 4; i++)
				{
					sLeaser.sprites[firstSprite + i].isVisible = false;
				}
				return;
			}
			for (int j = 0; j < 4; j++)
			{
				sLeaser.sprites[firstSprite + j].isVisible = true;
				Vector2 vector = partPos + basePos + Custom.DegToVec(-90f - 90f * (float)j) * 4f;
				sLeaser.sprites[firstSprite + j].x = vector.x - camPos.x;
				sLeaser.sprites[firstSprite + j].y = vector.y - camPos.y;
				if (j < 3 && (hologram as GamePadInstruction).buttons[j].pulsate)
				{
					sLeaser.sprites[firstSprite + j].color = (hologram as GamePadInstruction).buttons[j].color;
				}
				else
				{
					sLeaser.sprites[firstSprite + j].color = useColor;
				}
				if (UnityEngine.Random.value > useFade)
				{
					sLeaser.sprites[firstSprite + j].element = Futile.atlasManager.GetElementWithName("pixel");
					sLeaser.sprites[firstSprite + j].anchorY = 0f;
					sLeaser.sprites[firstSprite + j].rotation = Custom.AimFromOneVectorToAnother(partPos, headPos);
					sLeaser.sprites[firstSprite + j].scaleY = Vector2.Distance(partPos, headPos);
				}
				else
				{
					sLeaser.sprites[firstSprite + j].element = Futile.atlasManager.GetElementWithName("Circle4");
					sLeaser.sprites[firstSprite + j].rotation = 0f;
					sLeaser.sprites[firstSprite + j].scaleY = 1f;
					sLeaser.sprites[firstSprite + j].anchorY = 0.5f;
				}
			}
		}
	}

	public class GamePadStickSocket : OverseerHologram.HologramPart
	{
		public float scale = 0.6f;

		public GamePadStickSocket(OverseerHologram hologram, int firstSprite)
			: base(hologram, firstSprite)
		{
			float num = 35f * scale;
			for (int i = 0; i < 8; i++)
			{
				float num2 = (float)i / 8f;
				float num3 = (float)(i + 1) / 8f;
				Add3DLine(Custom.DegToVec(num2 * 360f) * num, Custom.DegToVec(num3 * 360f) * num, 5f);
			}
		}

		public override void Update()
		{
			base.Update();
		}
	}

	public class GamePadStick : OverseerHologram.HologramPart
	{
		private GamePadStickSocket socket;

		public int counter;

		public bool outToSide;

		public Vector2 stickPos;

		public Vector2 stickVel;

		private bool switchController;

		private static readonly float switchControllerStickBigger = 6f;

		public Vector2 showDirection => (hologram as InputInstruction).direction.ToVector2().normalized;

		protected override Color GetToColor
		{
			get
			{
				if (outToSide)
				{
					return new Color(1f, 1f, 1f);
				}
				return base.GetToColor;
			}
		}

		public GamePadStick(InputInstruction hologram, int firstSprite, GamePadStickSocket socket, bool switchController)
			: base(hologram, firstSprite)
		{
			this.socket = socket;
			this.switchController = switchController;
			float num = (switchController ? (12f + switchControllerStickBigger) : 12f) * socket.scale;
			float num2 = -5f;
			float num3 = 5f * socket.scale;
			for (int i = 0; i < 8; i++)
			{
				float num4 = (float)i / 8f;
				float num5 = (float)(i + 1) / 8f;
				AddLine(Custom.Vec3FromVec2(Custom.DegToVec(num4 * 360f) * num, -5f + num2), Custom.Vec3FromVec2(Custom.DegToVec(num5 * 360f) * num, -5f + num2));
				AddLine(Custom.Vec3FromVec2(Custom.DegToVec(num4 * 360f) * (num + num3), num2), Custom.Vec3FromVec2(Custom.DegToVec(num5 * 360f) * (num + num3), num2));
				AddLine(Custom.Vec3FromVec2(Custom.DegToVec(num4 * 360f) * num, 5f + num2), Custom.Vec3FromVec2(Custom.DegToVec(num5 * 360f) * num, 5f + num2));
				AddLine(Custom.Vec3FromVec2(Custom.DegToVec(num4 * 360f) * num, -5f + num2), Custom.Vec3FromVec2(Custom.DegToVec(num4 * 360f) * (num + num3), num2));
				AddLine(Custom.Vec3FromVec2(Custom.DegToVec(num4 * 360f) * num, 5f + num2), Custom.Vec3FromVec2(Custom.DegToVec(num4 * 360f) * (num + num3), num2));
			}
		}

		public override void Update()
		{
			base.Update();
			if ((hologram as InputInstruction).direction.x != 0 || (hologram as InputInstruction).direction.y != 0)
			{
				counter--;
				if (counter < 1)
				{
					outToSide = !outToSide;
					counter = 20;
				}
			}
			else
			{
				outToSide = false;
				counter = 0;
			}
			if (outToSide)
			{
				stickVel += showDirection * (0.75f * Mathf.InverseLerp(20f, 10f, counter));
			}
			stickPos += stickVel;
			stickVel *= 0.75f;
			stickVel -= stickPos / 1.5f;
			if (stickPos.magnitude > 1f)
			{
				socket.offset += stickPos * (switchController ? 2.2f : 1f);
			}
			stickPos = Vector2.ClampMagnitude(stickPos, 1f);
			offset = socket.offset + stickPos * ((switchController ? (20f - switchControllerStickBigger) : 20f) * socket.scale);
			visible = socket.visible;
		}
	}

	public class GamePadButton : ButtonOrKey
	{
		public Color buttonColor;

		protected override Color GetToColor
		{
			get
			{
				if (down)
				{
					return new Color(1f, 1f, 1f);
				}
				return buttonColor;
			}
		}

		public GamePadButton(OverseerHologram hologram, int firstSprite, Options.ControlSetup.Preset controllerType)
			: base(hologram, firstSprite)
		{
			float num = 18f;
			float num2 = 5f;
			bool flag = controllerType == Options.ControlSetup.Preset.PS4DualShock || controllerType == Options.ControlSetup.Preset.PS5DualSense;
			int num3 = (flag ? 24 : 8);
			for (int i = 0; i < num3; i++)
			{
				float num4 = (float)i / (float)num3;
				float num5 = (float)(i + 1) / (float)num3;
				if (flag)
				{
					AddDoubleLine(Custom.DegToVec(num4 * 360f + 360f / ((float)num3 / 2f)) * num, Custom.DegToVec(num5 * 360f + 360f / ((float)num3 / 2f)) * num, num2);
				}
				else
				{
					Add3DLine(Custom.DegToVec(num4 * 360f + 360f / ((float)num3 / 2f)) * num, Custom.DegToVec(num5 * 360f + 360f / ((float)num3 / 2f)) * num, num2);
				}
			}
			for (int j = 0; j < lines.Count; j++)
			{
				if (lines[j].A.z < 0f)
				{
					lines[j].A = Custom.Vec3FromVec2(lines[j].A * 0.9f, lines[j].A.z);
					lines[j].A2 = Custom.Vec3FromVec2(lines[j].A2 * 0.9f, num2);
				}
				else
				{
					lines[j].A2 = Custom.Vec3FromVec2(lines[j].A2 * 1.1f, lines[j].A2.z);
				}
				if (lines[j].B.z < 0f)
				{
					lines[j].B = Custom.Vec3FromVec2(lines[j].B * 0.9f, lines[j].B.z);
					lines[j].B2 = Custom.Vec3FromVec2(lines[j].B2 * 0.9f, num2);
				}
				else
				{
					lines[j].B2 = Custom.Vec3FromVec2(lines[j].B2 * 1.1f, lines[j].B2.z);
				}
			}
		}
	}

	public class KeyBoardInstruction : InputInstruction
	{
		public KeyBoardKey[] keys;

		public KeyBoardKey Left => keys[0];

		public KeyBoardKey Right => keys[2];

		public KeyBoardKey Up => keys[1];

		public KeyBoardKey Down => keys[3];

		public KeyBoardKey PickUp => keys[4];

		public KeyBoardKey Jump => keys[5];

		public KeyBoardKey Throw => keys[6];

		public KeyBoardInstruction(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			keys = new KeyBoardKey[7];
			for (int i = 0; i < keys.Length; i++)
			{
				keys[i] = new KeyBoardKey(this, totalSprites);
				AddPart(keys[i]);
			}
			Down.offset = new Vector2(35f, 0f);
			Right.offset = new Vector2(70f, 0f);
			Up.offset = new Vector2(35f, 35f);
			Throw.offset = new Vector2(-45f, 0f);
			Jump.offset = new Vector2(-80f, 0f);
			PickUp.offset = new Vector2(-125f, 0f);
			PickUp.MakeWider(10f);
			Down.symbol = "Arrow";
			Right.symbol = "Arrow";
			Up.symbol = "Arrow";
			Left.symbol = "Arrow";
			Left.symbolRotation = -90f;
			Right.symbolRotation = 90f;
			Down.symbolRotation = 180f;
			PickUp.symbol = "Shift";
			Jump.symbol = "Z";
			Throw.symbol = "X";
			AllPartsAdded();
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			PickUp.visible = !directionOnly && !hideInputs;
			Jump.visible = !directionOnly && !hideInputs;
			Throw.visible = !directionOnly && !hideInputs;
			Left.visible = !hideInputs;
			Right.visible = !hideInputs;
			Up.visible = !hideInputs;
			Down.visible = !hideInputs;
			Left.pulsate = direction.x < 0;
			Right.pulsate = direction.x > 0;
			Up.pulsate = direction.y > 0;
			Down.pulsate = direction.y < 0;
			PickUp.pulsate = showPickup;
			Jump.pulsate = showJump;
			Throw.pulsate = showThrow;
		}

		public override float DisplayPosScore(IntVector2 testPos)
		{
			float num = base.DisplayPosScore(testPos);
			if (!directionOnly && room.readyForAI)
			{
				num -= (float)Math.Min(room.aimap.getTerrainProximity(testPos + new IntVector2(-10, 0)), 5) * 50f;
			}
			return num;
		}
	}

	public class SwitchInstruction : InputInstruction
	{
		public class SwitchButton : HologramPart
		{
			private int symbolSprite;

			public bool pulsate;

			public int counter;

			public bool down;

			public int timeUp = 10;

			public int timeDown = 10;

			protected override Color GetToColor
			{
				get
				{
					if (down)
					{
						return new Color(1f, 1f, 1f);
					}
					return hologram.color;
				}
			}

			public SwitchButton(OverseerHologram hologram, int firstSprite)
				: base(hologram, firstSprite)
			{
				symbolSprite = totalSprites;
				totalSprites++;
				float num = 9f;
				float num2 = 2f;
				for (int i = 0; i < 8; i++)
				{
					float num3 = (float)i / 8f;
					float num4 = (float)(i + 1) / 8f;
					Add3DLine(Custom.DegToVec(num3 * 360f + 22.5f) * num, Custom.DegToVec(num4 * 360f + 22.5f) * num, num2);
				}
				for (int j = 0; j < lines.Count; j++)
				{
					if (lines[j].A.z < 0f)
					{
						lines[j].A = Custom.Vec3FromVec2(lines[j].A * 0.8f, lines[j].A.z);
						lines[j].A2 = Custom.Vec3FromVec2(lines[j].A2 * 0.8f, num2);
					}
					else
					{
						lines[j].A2 = Custom.Vec3FromVec2(lines[j].A2, lines[j].A2.z);
					}
					if (lines[j].B.z < 0f)
					{
						lines[j].B = Custom.Vec3FromVec2(lines[j].B * 0.8f, lines[j].B.z);
						lines[j].B2 = Custom.Vec3FromVec2(lines[j].B2 * 0.8f, num2);
					}
					else
					{
						lines[j].B2 = Custom.Vec3FromVec2(lines[j].B2, lines[j].B2.z);
					}
				}
			}

			public override void Update()
			{
				base.Update();
				if (pulsate)
				{
					counter--;
					if (counter < 1)
					{
						down = !down;
						counter = (down ? timeDown : timeUp);
					}
				}
				else
				{
					down = false;
					counter = 0;
				}
				transform = Custom.LerpAndTick(transform, down ? 1f : 0f, 0.14f, 0.125f);
			}

			public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
			{
				base.InitiateSprites(sLeaser, rCam);
				sLeaser.sprites[firstSprite + symbolSprite] = new FSprite("LizardBubble0");
			}

			public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos, Vector2 partPos, Vector2 headPos, float useFade, float popOut, Color useColor)
			{
				base.DrawSprites(sLeaser, rCam, timeStacker, camPos, partPos, headPos, useFade, popOut, useColor);
				if (UnityEngine.Random.value > Mathf.InverseLerp(0.5f, 1f, useFade) || Mathf.Lerp(lastTransform, transform, timeStacker) < 0.05f)
				{
					sLeaser.sprites[firstSprite + symbolSprite].isVisible = false;
					sLeaser.sprites[firstSprite + symbolSprite].scale = 0f;
					return;
				}
				sLeaser.sprites[firstSprite + symbolSprite].isVisible = true;
				sLeaser.sprites[firstSprite + symbolSprite].scale = 0.85f;
				Vector3 b = Custom.Vec3FromVec2(partPos, -2f + 4f * Mathf.Lerp(lastTransform, transform, timeStacker));
				b = Vector3.Lerp(headPos, b, popOut);
				b = hologram.ApplyDepthOnVector(b, rCam, camPos);
				sLeaser.sprites[firstSprite + symbolSprite].alpha = Mathf.Lerp(lastTransform, transform, timeStacker);
				sLeaser.sprites[firstSprite + symbolSprite].x = b.x;
				sLeaser.sprites[firstSprite + symbolSprite].y = b.y;
				sLeaser.sprites[firstSprite + symbolSprite].color = useColor;
			}
		}

		public GamePadStickSocket socket;

		public Vector2[] partsOffset;

		public SwitchButton[] buttons;

		public SwitchButton UnusedButton => buttons[0];

		public SwitchButton Throw => buttons[1];

		public SwitchButton Jump => buttons[2];

		public SwitchButton PickUp => buttons[3];

		public SwitchInstruction(Overseer overseer, Message message, Creature communicateWith, float importance)
			: base(overseer, message, communicateWith, importance)
		{
			socket = new GamePadStickSocket(this, totalSprites);
			AddPart(socket);
			AddPart(new GamePadStick(this, totalSprites, socket, switchController: true));
			buttons = new SwitchButton[4];
			for (int i = 0; i < buttons.Length; i++)
			{
				buttons[i] = new SwitchButton(this, totalSprites);
				AddPart(buttons[i]);
			}
			AllPartsAdded();
			partsOffset = new Vector2[5];
			partsOffset[0] = new Vector2(-30f, 0f);
			for (int j = 0; j < 4; j++)
			{
				partsOffset[j + 1] = new Vector2(30f, 0f) + Custom.DegToVec(j * 90) * 16f;
			}
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			if (dontTouchInputCross != null)
			{
				dontTouchInputCross.offset = socket.offset;
			}
			socket.offset = Vector2.Lerp(Custom.MoveTowards(socket.offset, partsOffset[0], 2f), partsOffset[0], 0.1f);
			socket.visible = !hideInputs;
			for (int i = 0; i < 4; i++)
			{
				buttons[i].offset = Vector2.Lerp(Custom.MoveTowards(buttons[i].offset, partsOffset[i + 1], 2f), partsOffset[i + 1], 0.1f);
				buttons[i].visible = !hideInputs;
			}
			PickUp.pulsate = showPickup;
			Jump.pulsate = showJump;
			Throw.pulsate = showThrow;
		}
	}

	public class GamePadInstruction : InputInstruction
	{
		public GamePadSilhouette silhouette;

		public Symbol gamepadSymbol;

		public GamePadStickSocket socket;

		public GamePadButton[] buttons;

		public bool directionAlwaysVisible;

		public float horizontalOffset;

		public new HologramPart[] parts;

		public int[] partsRemainVisible;

		public GamePadButton PickUp => buttons[0];

		public GamePadButton Jump => buttons[1];

		public GamePadButton Throw => buttons[2];

		public GamePadInstruction(Overseer overseer, Message message, Creature communicateWith, float importance, Options.ControlSetup.Preset controllerType)
			: base(overseer, message, communicateWith, importance)
		{
			socket = new GamePadStickSocket(this, totalSprites);
			AddPart(socket);
			AddPart(new GamePadStick(this, totalSprites, socket, switchController: false));
			string text = null;
			if (controllerType == Options.ControlSetup.Preset.PS5DualSense)
			{
				text = "ps5controllertiny";
			}
			else if (controllerType == Options.ControlSetup.Preset.PS4DualShock)
			{
				text = "ps4controllertiny";
			}
			if (text != null && !Futile.atlasManager.DoesContainElementWithName(text))
			{
				Texture2D texture2D = new Texture2D(0, 0);
				string path = AssetManager.ResolveFilePath("illustrations/" + text + ".png");
				if (File.Exists(path))
				{
					texture2D.LoadImage(File.ReadAllBytes(path));
				}
				texture2D.filterMode = FilterMode.Point;
				Futile.atlasManager.LoadAtlasFromTexture(text, texture2D, textureFromAsset: false);
			}
			if (text != null)
			{
				gamepadSymbol = new Symbol(this, totalSprites, text);
				gamepadSymbol.offset = new Vector2(0f, -40f);
				AddPart(gamepadSymbol);
			}
			silhouette = new GamePadSilhouette(this, totalSprites, controllerType);
			AddPart(silhouette);
			buttons = new GamePadButton[3];
			for (int i = 0; i < buttons.Length; i++)
			{
				buttons[i] = new GamePadButton(this, totalSprites, controllerType);
				AddPart(buttons[i]);
			}
			if (controllerType == Options.ControlSetup.Preset.XBox)
			{
				PickUp.symbol = "X";
				Jump.symbol = "A";
				Throw.symbol = "B";
				PickUp.buttonColor = new Color(0.2f, 0.6f, 1f);
				Jump.buttonColor = new Color(0.4f, 1f, 0.2f);
				Throw.buttonColor = new Color(1f, 0.2f, 0.2f);
			}
			else
			{
				PickUp.symbol = "Square";
				Jump.symbol = "Cross";
				Throw.symbol = "Circle";
				PickUp.buttonColor = new Color(0.9f, 0.3f, 1f);
				Jump.buttonColor = new Color(0.5f, 0.5f, 1f);
				Throw.buttonColor = new Color(1f, 0.3f, 0.3f);
			}
			parts = new HologramPart[4];
			partsRemainVisible = new int[parts.Length];
			parts[0] = socket;
			parts[1] = buttons[0];
			parts[2] = buttons[1];
			parts[3] = buttons[2];
			AllPartsAdded();
		}

		public override void Update(bool eu)
		{
			base.Update(eu);
			if (hideInputs)
			{
				if (silhouette != null)
				{
					silhouette.visible = false;
				}
				if (gamepadSymbol != null)
				{
					gamepadSymbol.visible = false;
				}
				for (int i = 0; i < parts.Length; i++)
				{
					partsRemainVisible[i] = 0;
				}
			}
			else
			{
				if (silhouette != null)
				{
					silhouette.visible = true;
				}
				if (gamepadSymbol != null)
				{
					gamepadSymbol.visible = true;
				}
				for (int j = 0; j < parts.Length; j++)
				{
					partsRemainVisible[j] = Math.Max(0, partsRemainVisible[j] - 1);
				}
				if (directionAlwaysVisible || direction.x != 0 || direction.y != 0)
				{
					partsRemainVisible[0] = Math.Max(partsRemainVisible[0], 30);
				}
				if (dontTouchInputCross != null && dontTouchInputCross.visible)
				{
					partsRemainVisible[0] = Math.Max(partsRemainVisible[0], 2);
				}
				if (showPickup)
				{
					partsRemainVisible[1] = (partsRemainVisible[1] = Math.Max(partsRemainVisible[1], 30));
				}
				if (showJump)
				{
					partsRemainVisible[2] = (partsRemainVisible[2] = Math.Max(partsRemainVisible[2], 30));
				}
				if (showThrow)
				{
					partsRemainVisible[3] = (partsRemainVisible[3] = Math.Max(partsRemainVisible[3], 30));
				}
			}
			socket.visible = partsRemainVisible[0] > 0;
			PickUp.visible = partsRemainVisible[1] > 0;
			Jump.visible = partsRemainVisible[2] > 0;
			Throw.visible = partsRemainVisible[3] > 0;
			if (dontTouchInputCross != null)
			{
				dontTouchInputCross.offset = socket.offset;
			}
			int num = 0;
			for (int k = 0; k < parts.Length; k++)
			{
				if (parts[k].visible)
				{
					num++;
				}
			}
			if (num == 1)
			{
				for (int l = 0; l < parts.Length; l++)
				{
					if (parts[l].visible)
					{
						parts[l].offset = Vector2.Lerp(Custom.MoveTowards(parts[l].offset, new Vector2(0f, 0f), 2f), new Vector2(0f, 0f), 0.1f);
						break;
					}
				}
			}
			else
			{
				float num2 = (float)(num - 1) * 25f;
				int num3 = 0;
				for (int m = 0; m < parts.Length; m++)
				{
					if (parts[m].visible)
					{
						float t = (float)num3 / (float)(num - 1);
						Vector2 b = new Vector2(Mathf.Lerp(0f - num2, num2, t), 0f);
						parts[m].offset = Vector2.Lerp(Custom.MoveTowards(parts[m].offset, b, 2f), b, 0.1f);
						num3++;
					}
				}
			}
			PickUp.pulsate = showPickup;
			Jump.pulsate = showJump;
			Throw.pulsate = showThrow;
		}

		public override float DisplayPosScore(IntVector2 testPos)
		{
			float num = base.DisplayPosScore(testPos);
			if (!directionOnly && room.readyForAI)
			{
				num -= (float)Math.Min(room.aimap.getTerrainProximity(testPos + new IntVector2(10, 0)), 5) * 50f;
			}
			return num;
		}
	}

	public class WaitMeter
	{
		public class MeterBox : OverseerHologram.HologramPart
		{
			public bool lit;

			public Color fillColor = new Color(1f, 1f, 1f);

			protected override Color GetToColor
			{
				get
				{
					if (lit)
					{
						return fillColor;
					}
					return Custom.RGB2RGBA(base.GetToColor * 0.75f, 1f);
				}
			}

			public MeterBox(OverseerHologram hologram, int firstSprite, float f)
				: base(hologram, firstSprite)
			{
				float num = 50f;
				float num2 = 60f;
				float num3 = 2.5f;
				Add3DLine(Custom.DegToVec(f * 360f - num3) * num, Custom.DegToVec(f * 360f + num3) * num, 5f);
				Add3DLine(Custom.DegToVec(f * 360f + num3) * num, Custom.DegToVec(f * 360f + num3) * num2, 5f);
				Add3DLine(Custom.DegToVec(f * 360f + num3) * num2, Custom.DegToVec(f * 360f - num3) * num2, 5f);
				Add3DLine(Custom.DegToVec(f * 360f - num3) * num2, Custom.DegToVec(f * 360f - num3) * num, 5f);
				Vector3 vector = default(Vector3);
				for (int i = 0; i < lines.Count; i++)
				{
					vector += lines[i].A;
				}
				vector /= (float)lines.Count;
				for (int j = 0; j < lines.Count; j++)
				{
					lines[j].A -= (lines[j].A2 - vector).normalized * 1f;
					lines[j].B -= (lines[j].B2 - vector).normalized * 1f;
					lines[j].A2 += (lines[j].A2 - vector).normalized * 2f;
					lines[j].B2 += (lines[j].B2 - vector).normalized * 2f;
				}
			}

			public override void Update()
			{
				base.Update();
				transform = Custom.LerpAndTick(transform, lit ? 1f : 0f, 0.05f, 0.1f);
			}
		}

		public float filled;

		public OverseerHologram hologram;

		public MeterBox[] parts;

		public Vector2 offset;

		private int blinkCounter;

		private bool blink;

		public bool visible;

		private float visibility;

		public bool blinkWhenFull = true;

		public WaitMeter(OverseerHologram hologram)
		{
			this.hologram = hologram;
			parts = new MeterBox[16];
			for (int i = 0; i < parts.Length; i++)
			{
				float f = (float)i / (float)parts.Length;
				parts[i] = new MeterBox(hologram, hologram.totalSprites, f);
				hologram.AddPart(parts[i]);
			}
		}

		public void Update()
		{
			if (filled == 1f && blinkWhenFull)
			{
				blinkCounter--;
				if (blinkCounter < 1)
				{
					blink = !blink;
					blinkCounter = 10;
					for (int i = 0; i < parts.Length; i++)
					{
						parts[i].lit = blink && visible;
					}
				}
			}
			else
			{
				for (int j = 0; j < parts.Length; j++)
				{
					float num = (float)j / (float)parts.Length;
					parts[j].lit = num < filled && visible;
				}
				blinkCounter = 0;
			}
			for (int k = 0; k < parts.Length; k++)
			{
				float num2 = (float)k / (float)parts.Length;
				parts[k].visible = num2 < visibility;
				parts[k].offset = offset;
			}
			visibility = Custom.LerpAndTick(visibility, visible ? 1f : 0f, 0.1f, 0.2f);
		}

		public void SetFillColor(Color col)
		{
			for (int i = 0; i < parts.Length; i++)
			{
				parts[i].fillColor = col;
			}
		}
	}

	public class PickupObjectInputInstructionController : InputInstruction.InputInstructionController
	{
		public Eat.FoodArrow arrow;

		private bool textShown;

		public PickupObjectInputInstructionController(InputInstruction instructionHologram, OverseerTutorialBehavior tutBehavior)
			: base(instructionHologram, tutBehavior)
		{
			Custom.Log("new pickup object");
			arrow = new Eat.FoodArrow(instructionHologram, instructionHologram.totalSprites);
			arrow.visible = false;
			instructionHologram.AddPart(arrow);
		}

		public override void Update()
		{
			base.Update();
			if (base.overseer.AI.communication != null && base.overseer.AI.communication.inputInstruction != null && !base.overseer.AI.communication.inputInstruction.slatedForDeletetion && base.overseer.AI.communication.inputInstruction is PickupObjectInstruction)
			{
				if ((!ModManager.MMF || MMF.cfgExtraTutorials.Value) && !textShown && base.room.game.cameras[0].hud != null && base.room.abstractRoom.name == "SU_A23")
				{
					base.room.game.cameras[0].hud.textPrompt.AddMessage(base.room.game.rainWorld.inGameTranslator.Translate("Objects can be picked up, carried, and tossed"), 0, 160, darken: true, hideHud: true);
					textShown = true;
				}
				instructionHologram.closeToPos = base.overseer.AI.communication.inputInstruction.instructionPos + new Vector2(0f, 60f);
				PickupObjectInstruction pickupObjectInstruction = base.overseer.AI.communication.inputInstruction as PickupObjectInstruction;
				arrow.visible = !pickupObjectInstruction.playerHasPickedUpAnItem;
				arrow.offset = base.overseer.AI.communication.inputInstruction.instructionPos + new Vector2(0f, 20f) - instructionHologram.pos;
				instructionHologram.showPickup = !pickupObjectInstruction.playerHasPickedUpAnItem;
				instructionHologram.showThrow = pickupObjectInstruction.playerHasPickedUpAnItem;
				if (pickupObjectInstruction.markInstructionAsFollowed)
				{
					base.overseer.AI.communication.InWorldInputInstructionCompleted(pickupObjectInstruction);
					pickupObjectInstruction.markInstructionAsFollowed = false;
				}
			}
			else
			{
				instructionHologram.stillRelevant = false;
			}
		}
	}

	public int encounterCounter = 40;

	public bool playerHasJumpedOverBox;

	public bool playerHasApproachedBox;

	public int boxTrouble;

	public bool playerHasClimbedPole;

	public bool playerHasMadeSuperJump;

	public int superJumpTrouble;

	public int poleTrouble;

	public int batTrouble;

	public int fruitTrouble;

	public int lastFoodInStomach;

	public bool[] messagesDisplayed;

	public bool bringInRain;

	public bool pauseRain = true;

	public bool displayRunMessage;

	public int batsInBatRoom = 5;

	public int availablefruitInFruitRoom = 3;

	public int superJumpAttemptTime;

	public OverseerAI overseerAI => AI as OverseerAI;

	public Overseer overseer => (AI as OverseerAI).overseer;

	public Room room => overseerAI.overseer.room;

	public Player player => room.game.Players[0].realizedCreature as Player;

	public OverseerTutorialBehavior(OverseerAI AI)
		: base(AI)
	{
		messagesDisplayed = new bool[7];
	}

	public override void Update()
	{
		if (room == null)
		{
			return;
		}
		bool flag = false;
		OverseerAbstractAI.DefineTutorialRooms();
		for (int i = 0; i < OverseerAbstractAI.tutorialRooms.Length; i++)
		{
			if (OverseerAbstractAI.tutorialRooms[i] == room.abstractRoom.name)
			{
				flag = true;
				break;
			}
		}
		if (encounterCounter > 0 && !room.IsGateRoom() && flag)
		{
			overseerAI.lookAt = new Vector2(2900f, 200f);
			overseerAI.bringUpLens = 0f;
			overseerAI.randomBringUpLensBonus = -100f;
			if (overseer.rootTile.x < 120)
			{
				overseer.rootTile.x = 137;
				for (int num = overseer.rootTile.y; num >= 0; num--)
				{
					if (room.GetTile(overseer.rootTile.x, num).Solid)
					{
						overseer.rootTile.y = num;
						break;
					}
				}
				overseer.rootPos = overseer.room.MiddleOfTile(overseer.rootPos);
				overseer.hoverTile = overseer.rootTile;
				overseer.nextHoverTile = overseer.rootTile;
				overseerAI.ResetZipPathingMatrix(overseer.rootTile);
			}
		}
		if (room.game.Players.Count == 0 || room.game.Players[0].realizedCreature == null || room.game.Players[0].realizedCreature.room != room)
		{
			return;
		}
		if (encounterCounter == 1)
		{
			overseerAI.lookAt = player.mainBodyChunk.pos;
			overseerAI.tempHoverTile = room.GetTilePosition(player.mainBodyChunk.pos + Custom.DirVec(player.mainBodyChunk.pos, overseer.rootPos) * 1600f);
		}
		if (ModManager.MSC && (overseer.abstractCreature.world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Artificer || overseer.abstractCreature.world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Gourmand || overseer.abstractCreature.world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Rivulet || overseer.abstractCreature.world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Spear || overseer.abstractCreature.world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Saint || overseer.abstractCreature.world.game.StoryCharacter == MoreSlugcatsEnums.SlugcatStatsName.Sofanthiel))
		{
			return;
		}
		if (ModManager.MMF && MMF.cfgExtraTutorials.Value && room.IsGateRoom() && flag && room.regionGate != null && room.regionGate.MeetRequirement)
		{
			overseer.TryAddHologram(MMFEnums.OverseerHologramMessage.TutorialGate, player, float.MaxValue);
		}
		switch (room.abstractRoom.name)
		{
		case "SU_C04":
			if (!messagesDisplayed[0] && player.mainBodyChunk.pos.x > 1450f)
			{
				TutorialText("You are hungry, find food", 10, 160, hideHud: true);
				messagesDisplayed[0] = true;
			}
			if (GetUpOnFirstBox.InZone(player.bodyChunks[1].pos))
			{
				playerHasApproachedBox = true;
			}
			if (playerHasApproachedBox)
			{
				boxTrouble++;
			}
			if (!playerHasJumpedOverBox && boxTrouble > 800 && GetUpOnFirstBox.InZone(player.bodyChunks[1].pos))
			{
				overseer.TryAddHologram(OverseerHologram.Message.GetUpOnFirstBox, player, float.MaxValue);
			}
			if (encounterCounter > 0 && (room.ViewedByAnyCamera(overseer.mainBodyChunk.pos, 0f) || boxTrouble > 400))
			{
				encounterCounter--;
			}
			break;
		case "SU_A41":
			if (!playerHasClimbedPole && player.mainBodyChunk.pos.y < 250f && player.mainBodyChunk.pos.x < 700f)
			{
				poleTrouble++;
			}
			if (poleTrouble > 50 && player.mainBodyChunk.pos.y > 300f)
			{
				playerHasClimbedPole = true;
			}
			if (poleTrouble > 200 && !playerHasClimbedPole && ClimbPole.InZone(player.bodyChunks[1].pos))
			{
				overseer.TryAddHologram(OverseerHologram.Message.ClimbPole, player, float.MaxValue);
			}
			else if (player.FoodInStomach < player.slugcatStats.maxFood - 1)
			{
				overseer.TryAddHologram(OverseerHologram.Message.TutorialFood, player, 0.5f);
			}
			else
			{
				overseer.TryAddHologram(OverseerHologram.Message.Shelter, player, 0.5f);
			}
			if (overseer.hologram != null && overseer.hologram is OverseerHologram.ShelterPointer)
			{
				(overseer.hologram as OverseerHologram.ShelterPointer).FORCEPOINT = 1;
			}
			break;
		case "SU_A42":
			batTrouble++;
			if (EatInstructionRelevant())
			{
				overseer.TryAddHologram(OverseerHologram.Message.EatInstruction, player, 0.5f);
			}
			if (!messagesDisplayed[1] && batTrouble > 30)
			{
				TutorialText("Catch and eat them", 10, 120, hideHud: true);
				messagesDisplayed[1] = true;
			}
			break;
		case "SU_A43":
			if (player.FoodInStomach < player.slugcatStats.foodToHibernate)
			{
				overseer.TryAddHologram(OverseerHologram.Message.TutorialFood, player, 0.5f);
				break;
			}
			if (!messagesDisplayed[2])
			{
				TutorialText("Leap the gap", 40, 120, hideHud: true);
				messagesDisplayed[2] = true;
			}
			if (player.mainBodyChunk.pos.x > 600f)
			{
				displayRunMessage = true;
				bringInRain = true;
				pauseRain = false;
			}
			if (player.mainBodyChunk.pos.y < 400f)
			{
				superJumpTrouble++;
			}
			if (!playerHasMadeSuperJump && superJumpTrouble > 40 && SuperJump.InZone(player.bodyChunks[1].pos))
			{
				overseer.TryAddHologram(OverseerHologram.Message.SuperJump, player, float.MaxValue);
			}
			else
			{
				overseer.TryAddHologram(OverseerHologram.Message.Shelter, player, 0.5f);
			}
			if (player.mainBodyChunk.pos.x < 530f && player.mainBodyChunk.pos.y < 400f)
			{
				playerHasMadeSuperJump = false;
			}
			break;
		case "SU_A22":
			pauseRain = false;
			if (player.FoodInStomach >= player.slugcatStats.foodToHibernate)
			{
				overseer.TryAddHologram(OverseerHologram.Message.Shelter, player, 0.5f);
				if (!messagesDisplayed[3] && displayRunMessage)
				{
					TutorialText("Run!", 40, 60, hideHud: true);
					messagesDisplayed[3] = true;
				}
			}
			if (!messagesDisplayed[6] && player.enteringShortCut.HasValue && player.enteringShortCut.Value.y < 20)
			{
				TutorialText("This place is safe. Stay here to hibernate", 50, 160, hideHud: true);
				messagesDisplayed[6] = true;
			}
			if (overseer.hologram != null && overseer.hologram is OverseerHologram.ShelterPointer)
			{
				(overseer.hologram as OverseerHologram.ShelterPointer).FORCEPOINT = 2;
			}
			break;
		case "SU_A44":
			fruitTrouble++;
			if (player.input[0].jmp && !player.input[1].jmp)
			{
				fruitTrouble += 100;
			}
			if (!messagesDisplayed[4] && fruitTrouble > 30)
			{
				TutorialText("Jump and grab them. They're delicious!", 10, 120, hideHud: true);
				messagesDisplayed[4] = true;
			}
			if (EatInstructionRelevant())
			{
				overseer.TryAddHologram(OverseerHologram.Message.EatInstruction, player, 0.5f);
			}
			break;
		}
		if (player.room != null && !player.room.IsGateRoom())
		{
			if (player.FoodInStomach >= player.slugcatStats.foodToHibernate && lastFoodInStomach < player.slugcatStats.foodToHibernate)
			{
				if (player.slugcatStats.name == SlugcatStats.Name.Yellow)
				{
					TutorialText("Three is enough to hibernate", 10, 120, hideHud: false);
				}
				else
				{
					TutorialText("Four is enough to hibernate", 10, 120, hideHud: false);
				}
			}
			else if (player.FoodInStomach > player.slugcatStats.foodToHibernate && lastFoodInStomach <= player.slugcatStats.foodToHibernate)
			{
				if (player.slugcatStats.name == SlugcatStats.Name.Yellow)
				{
					TutorialText("Additional food (above three) is kept for later", 10, 120, hideHud: false);
				}
				else
				{
					TutorialText("Additional food (above four) is kept for later", 10, 120, hideHud: false);
				}
			}
			else if (player.FoodInStomach == player.slugcatStats.maxFood && lastFoodInStomach < player.slugcatStats.maxFood)
			{
				TutorialText("You are full", 10, 120, hideHud: false);
			}
		}
		lastFoodInStomach = player.FoodInStomach;
		if (pauseRain)
		{
			room.world.rainCycle.timer = 2000;
		}
		else if (bringInRain)
		{
			if (room.world.rainCycle.timer < room.world.rainCycle.cycleLength - 2400)
			{
				room.world.rainCycle.timer = Math.Min(room.world.rainCycle.cycleLength - 2400, room.world.rainCycle.timer + 400);
			}
			if (!messagesDisplayed[5])
			{
				TutorialText("Rain is coming! Find shelter", 40, 200, hideHud: true);
				messagesDisplayed[5] = true;
			}
			if (room.world.rainCycle.timer < room.world.rainCycle.cycleLength - 1000)
			{
				room.world.rainCycle.timer = Math.Min(room.world.rainCycle.cycleLength - 1000, room.world.rainCycle.timer + 10);
				if (room.game.cameras[0].hud != null)
				{
					room.game.cameras[0].hud.rainMeter.halfTimeBlink = 0;
				}
			}
			else
			{
				bringInRain = false;
			}
		}
		AbstractRoom abstractRoom = room.world.GetAbstractRoom("SU_A22");
		if (abstractRoom == null)
		{
			return;
		}
		for (int j = 0; j < abstractRoom.creatures.Count; j++)
		{
			if (abstractRoom.creatures[j].creatureTemplate.type == CreatureTemplate.Type.GreenLizard && (abstractRoom.creatures[j].state as LizardState).alive)
			{
				(abstractRoom.creatures[j].state as LizardState).Die();
			}
		}
	}

	public bool EatInstructionRelevant()
	{
		if (room == null)
		{
			return false;
		}
		if (room.abstractRoom.name == "SU_A44")
		{
			if (player.FoodInStomach >= player.slugcatStats.maxFood || fruitTrouble < 200)
			{
				return false;
			}
		}
		else
		{
			if (!(room.abstractRoom.name == "SU_A42"))
			{
				return false;
			}
			if (player.FoodInStomach >= player.slugcatStats.foodToHibernate || batTrouble < 100)
			{
				return false;
			}
		}
		int num = 0;
		for (int i = 0; i < room.physicalObjects.Length; i++)
		{
			for (int j = 0; j < room.physicalObjects[i].Count; j++)
			{
				if (room.physicalObjects[i][j] != null && room.physicalObjects[i][j] is IPlayerEdible)
				{
					num++;
				}
			}
		}
		if (num < 1)
		{
			return false;
		}
		if (num < 2 && room.abstractRoom.name == "SU_A44")
		{
			return false;
		}
		return true;
	}

	public float InfluenceHoverScoreOfTile(IntVector2 testTile, float f)
	{
		if (encounterCounter > 0 && testTile.x < 120)
		{
			return float.MaxValue;
		}
		return f;
	}

	public void TutorialText(string text, int wait, int time, bool hideHud)
	{
		if ((!ModManager.MMF || MMF.cfgExtraTutorials.Value) && room.game.cameras[0].hud != null)
		{
			room.game.cameras[0].hud.textPrompt.AddMessage(overseer.room.game.rainWorld.inGameTranslator.Translate(text), wait, time, darken: true, hideHud);
		}
	}
}
