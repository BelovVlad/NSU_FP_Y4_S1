using System;
using System.Collections.Generic;
using HUD;
using MoreSlugcats;
using RWCustom;
using UnityEngine;

namespace Menu;

public class KarmaLadder : PositionedMenuObject
{
	public class Phase : ExtEnum<Phase>
	{
		public static readonly Phase Resting = new Phase("Resting", register: true);

		public static readonly Phase Deselecting = new Phase("Deselecting", register: true);

		public static readonly Phase MovingA = new Phase("MovingA", register: true);

		public static readonly Phase MovingB = new Phase("MovingB", register: true);

		public static readonly Phase Settling = new Phase("Settling", register: true);

		public static readonly Phase Bump = new Phase("Bump", register: true);

		public static readonly Phase CappedMovement = new Phase("CappedMovement", register: true);

		public static readonly Phase CapBump = new Phase("CapBump", register: true);

		public static readonly Phase ReinforceSave = new Phase("ReinforceSave", register: true);

		public Phase(string value, bool register = false)
			: base(value, register)
		{
		}
	}

	public class KarmaSymbol : PositionedMenuObject
	{
		public FSprite[] sprites;

		public IntVector2 displayKarma;

		public float lineWidth;

		public float lastLineWidth;

		public int flickerCounter;

		public float energy;

		public float lastEnergy;

		public float lastDrawY;

		public KarmaLadder parent;

		public int pulsateCounter;

		public int waitForAnimate;

		public float fadeOut;

		public bool rippleMode;

		public float rippleLevel;

		public KarmaLadder ladder => owner as KarmaLadder;

		public int KarmaSprite => 0;

		public int RingSprite => 1;

		public int LineSprite => 2;

		public int TotalSprites => 5;

		public int displayKarmaCap
		{
			get
			{
				if (displayKarma.y < 100)
				{
					return displayKarma.y;
				}
				return 8;
			}
		}

		public int GlowSprite(int i)
		{
			return 3 + i;
		}

		public KarmaSymbol(Menu menu, MenuObject owner, Vector2 pos, FContainer container, FContainer foregroundContainer, IntVector2 displayKarma, bool rippleMode)
			: base(menu, owner, pos)
		{
			parent = owner as KarmaLadder;
			this.displayKarma = displayKarma;
			this.rippleMode = rippleMode;
			if (this.rippleMode)
			{
				rippleLevel = Mathf.Clamp(1f + (float)displayKarma.x * 0.5f, 1f, 5f);
			}
			sprites = new FSprite[TotalSprites];
			if (this.rippleMode)
			{
				sprites[KarmaSprite] = new FSprite(KarmaMeter.RippleSymbolSprite(small: false, rippleLevel));
			}
			else
			{
				sprites[KarmaSprite] = new FSprite(KarmaMeter.KarmaSymbolSprite(small: false, displayKarma));
			}
			sprites[RingSprite] = new FSprite("karmaRing");
			sprites[LineSprite] = new FSprite("pixel");
			for (int i = 0; i < 2; i++)
			{
				sprites[GlowSprite(i)] = new FSprite("Futile_White");
				sprites[GlowSprite(i)].shader = menu.manager.rainWorld.Shaders["FlatLight"];
			}
			container.AddChild(sprites[KarmaSprite]);
			container.AddChild(sprites[RingSprite]);
			container.AddChild(sprites[LineSprite]);
			foregroundContainer.AddChild(sprites[GlowSprite(0)]);
			foregroundContainer.AddChild(sprites[GlowSprite(1)]);
		}

		public void UpdateDisplayKarma(IntVector2 dpKarma)
		{
			displayKarma = dpKarma;
			if (rippleMode)
			{
				rippleLevel = Mathf.Clamp(1f + (float)displayKarma.x * 0.5f, 1f, 5f);
				sprites[KarmaSprite].element = Futile.atlasManager.GetElementWithName(KarmaMeter.RippleSymbolSprite(small: false, rippleLevel));
			}
			else
			{
				sprites[KarmaSprite].element = Futile.atlasManager.GetElementWithName(KarmaMeter.KarmaSymbolSprite(small: false, displayKarma));
			}
		}

		public override void Update()
		{
			base.Update();
			lastLineWidth = lineWidth;
			lastEnergy = energy;
			if (ModManager.MSC && parent.displayKarma.x == parent.moveToKarma && (parent.menu.ID == MoreSlugcatsEnums.ProcessID.KarmaToMinScreen || parent.menu.ID == MoreSlugcatsEnums.ProcessID.VengeanceGhostScreen || (ModManager.Expedition && menu.manager.rainWorld.ExpeditionMode && parent.moveToKarma == 0)))
			{
				waitForAnimate++;
				if (waitForAnimate == 49 && displayKarma.x == 0)
				{
					parent.NewPhase(Phase.CapBump);
				}
				if (waitForAnimate >= 50)
				{
					if (displayKarma.x == 0)
					{
						pulsateCounter++;
					}
					else if (!ModManager.Expedition || (ModManager.Expedition && !menu.manager.rainWorld.ExpeditionMode))
					{
						fadeOut = Mathf.Lerp(fadeOut, 1f, 0.1f);
					}
				}
			}
			float to = ((!(ladder.phase == Phase.MovingA)) ? Mathf.Clamp(Mathf.Min(Mathf.Abs((float)displayKarma.x - ladder.scroll), Mathf.Abs((float)(displayKarma.x + 1) - ladder.scroll)), 0f, 1f) : 1f);
			int a = (rippleMode ? (displayKarma.x - ladder.minRipple) : displayKarma.x);
			a = Mathf.Min(a, ladder.karmaSymbols.Count - 2);
			if (displayKarma.x < displayKarmaCap)
			{
				lineWidth *= (energy + ladder.karmaSymbols[a + 1].energy) / 2f;
			}
			lineWidth = Custom.LerpAndTick(lineWidth, to, 0.2f, 0.1f);
			if (UnityEngine.Random.value > Mathf.InverseLerp(5f, 40f, flickerCounter))
			{
				energy = Custom.LerpAndTick(energy, 1f, 0.1f, 1f / 70f);
			}
			if (flickerCounter > 0)
			{
				flickerCounter--;
				if (UnityEngine.Random.value < Mathf.InverseLerp(5f, 19f, flickerCounter))
				{
					energy = Mathf.Min(energy, Mathf.Lerp(energy, Mathf.Pow(UnityEngine.Random.value, Custom.LerpMap(flickerCounter, 50f, 2f, 3f, 0.2f)), 0.5f));
				}
			}
		}

		public override void GrafUpdate(float timeStacker)
		{
			base.GrafUpdate(timeStacker);
			float t = Custom.SCurve(Mathf.Lerp(ladder.lastFlat, ladder.flat, timeStacker), 0.09f);
			float num = Mathf.Lerp(250f, 1000f, t);
			float num2 = 2f * num * (float)Math.PI;
			float num3 = ((float)displayKarma.x - ladder.scroll) * (360f / num2) * 100f;
			if (Mathf.Abs(num3) > 90f)
			{
				sprites[KarmaSprite].isVisible = false;
				sprites[RingSprite].isVisible = false;
				sprites[GlowSprite(0)].isVisible = false;
				sprites[GlowSprite(1)].isVisible = false;
			}
			else
			{
				sprites[KarmaSprite].isVisible = true;
				sprites[RingSprite].isVisible = true;
				float num4 = num * Mathf.Sin((num3 + 63f / num2 * 180f) * ((float)Math.PI / 180f));
				float num5 = num * Mathf.Sin((num3 - 63f / num2 * 180f) * ((float)Math.PI / 180f));
				Vector2 vector = DrawPos(timeStacker) + new Vector2(0f, (num4 + num5) * 0.5f);
				vector.y = Mathf.Lerp(vector.y, DrawY(timeStacker) + ((float)displayKarma.x - ladder.scroll) * 100f, t);
				lastDrawY = vector.y;
				sprites[KarmaSprite].x = vector.x;
				sprites[KarmaSprite].y = vector.y;
				sprites[RingSprite].x = vector.x;
				sprites[RingSprite].y = vector.y;
				float num6 = Mathf.Clamp(Mathf.Abs((float)displayKarma.x - Mathf.Lerp(ladder.lastScroll, ladder.scroll, timeStacker)) / 0.75f, 0f, 1f);
				sprites[KarmaSprite].scaleY = Mathf.Lerp(Mathf.Abs(num4 - num5) / 63f, 1f, t);
				sprites[RingSprite].scaleY = Mathf.Lerp(Mathf.Abs(num4 - num5) / 63f, 1f, t);
				if (ModManager.MSC)
				{
					sprites[KarmaSprite].scaleX = 1f;
					sprites[RingSprite].scaleX = 1f;
					if (pulsateCounter > 0)
					{
						float num7 = Mathf.Sin((float)pulsateCounter / 25f) * 0.05f;
						sprites[KarmaSprite].scaleX += num7;
						sprites[RingSprite].scaleX += num7;
						sprites[KarmaSprite].scaleY += num7;
						sprites[RingSprite].scaleY += num7;
					}
				}
				if (num6 < 0.2f)
				{
					float num8 = Mathf.InverseLerp(0.2f, 0.1f, num6);
					num8 *= 0.3f + 0.7f * Mathf.Clamp(Mathf.Lerp(ladder.lastSelectionGlow, ladder.selectionGlow, timeStacker), 0f, 1f);
					float num9 = Mathf.InverseLerp(1f, 2f, Mathf.Lerp(ladder.lastSelectionGlow, ladder.selectionGlow, timeStacker));
					float num10 = 0f;
					if (ladder.reinforced)
					{
						num10 = 0.7f + 0.3f * Mathf.Sin((float)Math.PI * 2f * Mathf.Lerp(ladder.lastReinforcementCycle, ladder.reinforcementCycle, timeStacker));
						num10 = Mathf.Max(num10, num9);
						num10 *= 1f - num6;
						num10 *= 1f - Mathf.Lerp(ladder.lastReinforcementDeath, ladder.reinforcementDeath, timeStacker);
					}
					if ((owner.owner.menu as KarmaLadderScreen).hud != null && (owner.owner.menu as KarmaLadderScreen).hud.map != null)
					{
						float num11 = 1f - Mathf.Lerp((owner.owner.menu as KarmaLadderScreen).hud.map.lastFade, (owner.owner.menu as KarmaLadderScreen).hud.map.fade, timeStacker);
						num8 *= num11;
						num9 *= num11;
						num10 *= num11;
					}
					sprites[GlowSprite(0)].isVisible = true;
					sprites[GlowSprite(0)].x = vector.x;
					sprites[GlowSprite(0)].y = vector.y;
					sprites[GlowSprite(0)].scale = (Mathf.Lerp(70f, 150f, Mathf.Pow(num8, 0.5f)) + num9 * 50f + num10 * 40f) / 8f;
					sprites[GlowSprite(0)].alpha = Mathf.Lerp(0.2f * Mathf.Pow(num8, 1.5f), 0.4f, Mathf.Max(num9, num10 * 0.5f));
					sprites[GlowSprite(1)].isVisible = true;
					sprites[GlowSprite(1)].x = vector.x;
					sprites[GlowSprite(1)].y = vector.y;
					sprites[GlowSprite(1)].scale = (Mathf.Lerp(50f, 90f, num8) + num9 * 100f + 10f * num10) / 8f;
					sprites[GlowSprite(1)].alpha = Mathf.Lerp(0.4f * Mathf.Pow(num8, 0.5f), 0.8f + 0.1f * num10 * (1f - num9), Mathf.Max(num9, num10));
				}
				else
				{
					sprites[GlowSprite(0)].isVisible = false;
					sprites[GlowSprite(1)].isVisible = false;
				}
				float num12 = Mathf.Lerp(lastEnergy, energy, timeStacker);
				if (ModManager.MSC && pulsateCounter > 0)
				{
					float num13 = Mathf.Sin((float)pulsateCounter / 12.5f + (float)Math.PI / 2f) * 0.5f + 0.5f;
					Color color = new Color(1f, num13, num13);
					if (rippleMode)
					{
						color = Color.Lerp(Color.red, RainWorld.SaturatedGold, num13);
					}
					sprites[KarmaSprite].color = color;
					sprites[RingSprite].color = color;
					sprites[GlowSprite(0)].color = color;
					sprites[GlowSprite(1)].color = color;
				}
				else if (rippleMode)
				{
					Color color2 = Color.Lerp(Color.black, Color.Lerp(RainWorld.SaturatedGold, Menu.MenuColor(Menu.MenuColors.DarkGrey).rgb, num6), num12);
					sprites[KarmaSprite].color = color2;
					sprites[RingSprite].color = color2;
				}
				else
				{
					HSLColor hSLColor = HSLColor.Lerp(Menu.MenuColor(Menu.MenuColors.Black), HSLColor.Lerp(Menu.MenuColor(Menu.MenuColors.White), Menu.MenuColor(Menu.MenuColors.DarkGrey), num6), num12);
					sprites[KarmaSprite].color = hSLColor.rgb;
					sprites[RingSprite].color = hSLColor.rgb;
				}
			}
			if (ModManager.MSC && fadeOut > 0f)
			{
				for (int i = 0; i < sprites.Length; i++)
				{
					sprites[i].alpha = 1f - fadeOut;
				}
			}
			float num14 = ((float)displayKarma.x + 0.5f - ladder.scroll) * (360f / num2) * 100f;
			if (Mathf.Abs(num3) > 90f || displayKarma.x == displayKarmaCap)
			{
				sprites[LineSprite].isVisible = false;
				return;
			}
			sprites[LineSprite].isVisible = true;
			float a = num * Mathf.Sin(num14 * ((float)Math.PI / 180f));
			a = Mathf.Lerp(a, ((float)displayKarma.x + 0.5f - ladder.scroll) * 100f, t);
			sprites[LineSprite].x = DrawX(timeStacker);
			sprites[LineSprite].y = DrawY(timeStacker) + a;
			sprites[LineSprite].scaleX = 80f * Mathf.Pow(Mathf.Max(0f, Mathf.Lerp(lastLineWidth, lineWidth, timeStacker)), 0.6f);
			float lrp = Mathf.Clamp(Mathf.Abs((float)displayKarma.x + 0.5f - Mathf.Lerp(ladder.lastScroll, ladder.scroll, timeStacker)) / 0.75f, 0f, 1f);
			sprites[LineSprite].color = HSLColor.Lerp(Menu.MenuColor(Menu.MenuColors.Black), HSLColor.Lerp(Menu.MenuColor(Menu.MenuColors.MediumGrey), Menu.MenuColor(Menu.MenuColors.DarkGrey), lrp), Mathf.Pow(Mathf.Max(0f, Mathf.Lerp(lastLineWidth, lineWidth, timeStacker)), 2f)).rgb;
		}

		public override void RemoveSprites()
		{
			base.RemoveSprites();
			for (int i = 0; i < sprites.Length; i++)
			{
				sprites[i].RemoveFromContainer();
			}
		}
	}

	public global::HUD.HUD hud;

	public float scroll;

	public float lastScroll;

	public float scrollVel;

	public bool movementShown;

	public bool reinforced;

	public FSprite[] sprites;

	public List<KarmaSymbol> karmaSymbols;

	public IntVector2 displayKarma;

	public int moveToKarma;

	public bool cappedMovement;

	public float flat;

	public float lastFlat;

	public float selectionGlow;

	public float lastSelectionGlow;

	public float circleRad;

	public float lastCircleRad;

	public float circleThickness;

	public float lastCircleThickness;

	public float selectorWhite;

	public float lastSelectorWhite;

	public float reinforcementWhite;

	public float lastReinforcementWhite;

	public float reinforcementCycle;

	public float lastReinforcementCycle;

	public float reinforcementClamp;

	public float lastReinforcementClamp;

	public float reinforcementDeath;

	public float lastReinforcementDeath;

	public float reinforcementLines;

	public float lastReinforcementLines;

	public float localBloom;

	public float lastLocalBloom;

	public Phase phase = Phase.Resting;

	public int ticksInPhase;

	public bool karmaIncreasing;

	public MenuMicrophone.MenuSoundLoop movementSoundLoop;

	public List<EndgameMeter> endGameMeters;

	private bool increaseKarmaCapMode;

	private bool goToCapMode;

	private int increaseCapAnimation = -1;

	public bool startedAnimating;

	public bool displayMetersOnRest;

	public bool vengeanceMode;

	public bool rippleMode;

	public bool playerDeath;

	public int minRipple;

	public int maxRipple;

	public int endGameMeterAnimCounter = -1;

	public int nextMeterToAnimate;

	public int showEndGameMetersCounter = -1;

	public int CircleSprite => 12;

	public int BlackRibbonSprite => 13;

	public int BackgroundCircleSprite => 14;

	public int ReinforcementSprite => 15;

	public int BlackFadeSprite => 20;

	public int LocalBloomSprite => 21;

	public int TotalSprites => 22;

	public int BackgroundContainer => 0;

	public int MainContainer => 1;

	public int FadeCircleContainer => 2;

	private FContainer[] containers => (menu as KarmaLadderScreen).ladderContainers;

	public bool AllAnimationDone
	{
		get
		{
			for (int i = 0; i < endGameMeters.Count; i++)
			{
				if (endGameMeters[i].poweredOn && endGameMeters[i].meterAnimation < 1f)
				{
					return false;
				}
			}
			if (startedAnimating && displayKarma.x == moveToKarma)
			{
				return nextMeterToAnimate >= endGameMeters.Count;
			}
			return false;
		}
	}

	public int displayKarmaCap => displayKarma.y;

	public int SymbolGradientSprite(int side, int part)
	{
		return side * 2 + part;
	}

	public int LineSprite(int line, int part)
	{
		return 4 + line * 2 + part;
	}

	public int ReinforcementLineSprite(int i)
	{
		return 16 + i;
	}

	public KarmaLadder(Menu menu, MenuObject owner, Vector2 pos, global::HUD.HUD hud, IntVector2 displayKarma, float minRipple, float maxRipple, bool reinforced, bool playerDeath)
		: base(menu, owner, pos)
	{
		rippleMode = true;
		this.hud = hud;
		this.displayKarma = displayKarma;
		this.reinforced = reinforced;
		this.playerDeath = playerDeath;
		this.minRipple = (int)((minRipple - 1f) / 0.5f);
		this.maxRipple = (int)((maxRipple - 1f) / 0.5f);
		displayKarma.x = Custom.IntClamp(displayKarma.x, this.minRipple, this.maxRipple);
		if (playerDeath && !reinforced)
		{
			displayKarma.y--;
		}
		moveToKarma = Custom.IntClamp(displayKarma.y - 100, this.maxRipple, this.maxRipple);
		scroll = displayKarma.x;
		lastScroll = scroll;
		flat = 1f;
		lastFlat = 1f;
		circleRad = 53f;
		lastCircleRad = 53f;
		goToCapMode = menu.ID == ProcessManager.ProcessID.Statistics;
		sprites = new FSprite[TotalSprites];
		AddGraphicsBehindEndgameMeters();
		AddEndgameMeters();
		AddGraphicsBehindSymbols();
		karmaSymbols = new List<KarmaSymbol>();
		for (int i = this.minRipple; i <= this.maxRipple; i++)
		{
			_ = displayKarmaCap;
			karmaSymbols.Add(new KarmaSymbol(menu, this, new Vector2(0f, 0f), containers[MainContainer], containers[FadeCircleContainer], new IntVector2(i, -1), rippleMode: true));
			subObjects.Add(karmaSymbols[karmaSymbols.Count - 1]);
		}
		AddGraphicsInFrontOfSymbols();
		phase = Phase.Resting;
	}

	public KarmaLadder(Menu menu, MenuObject owner, Vector2 pos, global::HUD.HUD hud, IntVector2 displayKarma, bool reinforced)
		: base(menu, owner, pos)
	{
		this.hud = hud;
		this.displayKarma = displayKarma;
		this.reinforced = reinforced;
		moveToKarma = displayKarma.x;
		scroll = displayKarma.x;
		lastScroll = displayKarma.x;
		flat = 1f;
		lastFlat = 1f;
		circleRad = 53f;
		lastCircleRad = 53f;
		increaseKarmaCapMode = menu.ID == ProcessManager.ProcessID.GhostScreen;
		goToCapMode = menu.ID == ProcessManager.ProcessID.KarmaToMaxScreen || menu.ID == ProcessManager.ProcessID.Statistics;
		vengeanceMode = ModManager.MSC && (menu.ID == MoreSlugcatsEnums.ProcessID.KarmaToMinScreen || menu.ID == MoreSlugcatsEnums.ProcessID.VengeanceGhostScreen);
		sprites = new FSprite[TotalSprites];
		AddGraphicsBehindEndgameMeters();
		AddEndgameMeters();
		AddGraphicsBehindSymbols();
		karmaSymbols = new List<KarmaSymbol>();
		for (int i = 0; i <= displayKarmaCap; i++)
		{
			int preGhostEncounterKarmaCap = displayKarmaCap;
			if (increaseKarmaCapMode && i <= (menu as KarmaLadderScreen).preGhostEncounterKarmaCap)
			{
				preGhostEncounterKarmaCap = (menu as KarmaLadderScreen).preGhostEncounterKarmaCap;
			}
			karmaSymbols.Add(new KarmaSymbol(menu, this, new Vector2(0f, 0f), containers[MainContainer], containers[FadeCircleContainer], new IntVector2(i, preGhostEncounterKarmaCap), rippleMode: false));
			subObjects.Add(karmaSymbols[karmaSymbols.Count - 1]);
		}
		AddGraphicsInFrontOfSymbols();
		phase = Phase.Resting;
	}

	private void DebugMeter()
	{
		(menu as KarmaLadderScreen).winState = new WinState();
		int num = UnityEngine.Random.Range(1, 11);
		List<WinState.EndgameID> list = new List<WinState.EndgameID>();
		for (int i = 0; i < 10; i++)
		{
			list.Add(new WinState.EndgameID(ExtEnum<WinState.EndgameID>.values.entries[i]));
		}
		endGameMeters = new List<EndgameMeter>();
		for (int j = 0; j < 2; j++)
		{
			int num2 = num / 2;
			if (num % 2 == 1 && j == 1)
			{
				num2++;
			}
			float num3 = 180f / (float)(num2 + 1);
			for (int k = 0; k < num2; k++)
			{
				float ang = num3 * ((float)k + 1f) + ((j == 0) ? 0f : 180f);
				WinState.EndgameID endgameID = list[UnityEngine.Random.Range(0, list.Count)];
				list.Remove(endgameID);
				WinState.EndgameTracker endgameTracker = WinState.CreateAndAddTracker(endgameID, null);
				(menu as KarmaLadderScreen).winState.endgameTrackers.Add(endgameTracker);
				if (endgameTracker is WinState.FloatTracker)
				{
					(endgameTracker as WinState.FloatTracker).lastShownProgress = UnityEngine.Random.value * (endgameTracker as WinState.FloatTracker).max;
					(endgameTracker as WinState.FloatTracker).progress = UnityEngine.Random.value * (endgameTracker as WinState.FloatTracker).max;
				}
				else if (endgameTracker is WinState.IntegerTracker)
				{
					if (UnityEngine.Random.value < 0.5f)
					{
						(endgameTracker as WinState.IntegerTracker).lastShownProgress = (endgameTracker as WinState.IntegerTracker).max;
						(endgameTracker as WinState.IntegerTracker).progress = (endgameTracker as WinState.IntegerTracker).max;
					}
					else
					{
						(endgameTracker as WinState.IntegerTracker).lastShownProgress = (endgameTracker as WinState.IntegerTracker).max / 2;
						(endgameTracker as WinState.IntegerTracker).progress = ((UnityEngine.Random.value < 0.5f) ? (endgameTracker as WinState.IntegerTracker).max : UnityEngine.Random.Range(0, (endgameTracker as WinState.IntegerTracker).max));
					}
				}
				else if (endgameTracker is WinState.BoolArrayTracker)
				{
					for (int l = 0; l < (endgameTracker as WinState.BoolArrayTracker).progress.Length; l++)
					{
						(endgameTracker as WinState.BoolArrayTracker).lastShownProgress[l] = UnityEngine.Random.value < 0.5f;
						(endgameTracker as WinState.BoolArrayTracker).progress[l] = UnityEngine.Random.value < 0.5f;
					}
				}
				endGameMeters.Add(new EndgameMeter(menu, this, Custom.DegToVec(ang) * 225f, endgameTracker, containers[BackgroundContainer], containers[MainContainer]));
			}
		}
	}

	private void AddEndgameMeters()
	{
		endGameMeters = new List<EndgameMeter>();
		if ((menu as KarmaLadderScreen).winState != null)
		{
			if (menu is SleepAndDeathScreen && (menu as SleepAndDeathScreen).IsAnyDeath)
			{
				(menu as KarmaLadderScreen).winState.PlayerDied();
			}
			List<WinState.EndgameTracker> list = new List<WinState.EndgameTracker>();
			for (int i = 0; i < (menu as KarmaLadderScreen).winState.endgameTrackers.Count; i++)
			{
				if ((!ModManager.MSC || (menu as KarmaLadderScreen).winState.endgameTrackers[i].ID != MoreSlugcatsEnums.EndgameID.Gourmand) && (menu as KarmaLadderScreen).winState.endgameTrackers[i].AnyProgressToShow)
				{
					list.Add((menu as KarmaLadderScreen).winState.endgameTrackers[i]);
				}
			}
			int count = list.Count;
			int num = 0;
			for (int j = 0; j < 2; j++)
			{
				int num2 = count / 2;
				if (count % 2 == 1 && j == 1)
				{
					num2++;
				}
				float num3 = 180f / (float)(num2 + 1);
				for (int k = 0; k < num2; k++)
				{
					float ang = num3 * ((float)k + 1f) + ((j == 0) ? 0f : 180f);
					endGameMeters.Add(new EndgameMeter(menu, this, Custom.DegToVec(ang) * 225f, list[num], containers[BackgroundContainer], containers[MainContainer]));
					num++;
				}
			}
		}
		for (int l = 0; l < endGameMeters.Count; l++)
		{
			subObjects.Add(endGameMeters[l]);
		}
	}

	private void AddGraphicsBehindEndgameMeters()
	{
		sprites[BackgroundCircleSprite] = new FSprite("Futile_White");
		sprites[BackgroundCircleSprite].shader = menu.manager.rainWorld.Shaders["VectorCircle"];
		containers[MainContainer].AddChild(sprites[BackgroundCircleSprite]);
	}

	private void AddGraphicsBehindSymbols()
	{
		sprites[BlackRibbonSprite] = new FSprite("pixel");
		containers[MainContainer].AddChild(sprites[BlackRibbonSprite]);
	}

	private void AddGraphicsInFrontOfSymbols()
	{
		for (int i = 0; i < 2; i++)
		{
			sprites[SymbolGradientSprite(i, 0)] = new FSprite("LinearGradient200");
			sprites[SymbolGradientSprite(i, 0)].color = new Color(0f, 0f, 0f);
			sprites[SymbolGradientSprite(i, 0)].anchorY = 0f;
			containers[MainContainer].AddChild(sprites[SymbolGradientSprite(i, 0)]);
			sprites[SymbolGradientSprite(i, 1)] = new FSprite("pixel");
			sprites[SymbolGradientSprite(i, 1)].color = new Color(0f, 0f, 0f);
			sprites[SymbolGradientSprite(i, 1)].anchorY = 0f;
			containers[MainContainer].AddChild(sprites[SymbolGradientSprite(i, 1)]);
		}
		for (int j = 0; j < 4; j++)
		{
			sprites[LineSprite(j, 0)] = new FSprite("pixel");
			sprites[LineSprite(j, 0)].anchorY = 0f;
			sprites[LineSprite(j, 0)].scaleX = 3f;
			sprites[LineSprite(j, 0)].color = Menu.MenuRGB(Menu.MenuColors.MediumGrey);
			containers[MainContainer].AddChild(sprites[LineSprite(j, 0)]);
			sprites[LineSprite(j, 1)] = new FSprite("LinearGradient200");
			sprites[LineSprite(j, 1)].color = new Color(0f, 0f, 0f);
			sprites[LineSprite(j, 1)].anchorY = 0f;
			sprites[LineSprite(j, 1)].scaleX = 3f;
			containers[MainContainer].AddChild(sprites[LineSprite(j, 1)]);
		}
		for (int k = 0; k < 4; k++)
		{
			sprites[ReinforcementLineSprite(k)] = new CustomFSprite("pixel");
			containers[MainContainer].AddChild(sprites[ReinforcementLineSprite(k)]);
		}
		sprites[CircleSprite] = new FSprite("Futile_White");
		sprites[CircleSprite].shader = menu.manager.rainWorld.Shaders["VectorCircle"];
		containers[MainContainer].AddChild(sprites[CircleSprite]);
		sprites[ReinforcementSprite] = new FSprite("Futile_White");
		sprites[ReinforcementSprite].shader = menu.manager.rainWorld.Shaders["VectorCircle"];
		containers[MainContainer].AddChild(sprites[ReinforcementSprite]);
		sprites[BlackFadeSprite] = new FSprite("Futile_White");
		sprites[BlackFadeSprite].shader = menu.manager.rainWorld.Shaders["FlatLight"];
		containers[MainContainer].AddChild(sprites[BlackFadeSprite]);
		sprites[LocalBloomSprite] = new FSprite("Futile_White");
		sprites[LocalBloomSprite].shader = menu.manager.rainWorld.Shaders["LocalBloom"];
		containers[MainContainer].AddChild(sprites[LocalBloomSprite]);
	}

	public void GoToKarma(int newGoalKarma, bool displayMetersOnRest)
	{
		this.displayMetersOnRest = displayMetersOnRest;
		if (rippleMode)
		{
			moveToKarma = Custom.IntClamp(newGoalKarma, minRipple, maxRipple);
		}
		else
		{
			moveToKarma = newGoalKarma;
		}
		karmaIncreasing = moveToKarma > displayKarma.x;
		cappedMovement = moveToKarma < 0 || moveToKarma > displayKarmaCap;
		if (displayMetersOnRest && displayKarma.x == moveToKarma)
		{
			movementShown = true;
			showEndGameMetersCounter = 125;
		}
		startedAnimating = true;
	}

	public override void Update()
	{
		base.Update();
		if (showEndGameMetersCounter > -1 && !(menu as KarmaLadderScreen).LadderInCenter && endGameMeters.Count > 0)
		{
			pos.x = Mathf.Lerp(350f, Custom.LerpMap(menu.manager.rainWorld.options.ScreenSize.x, 1024f, 1366f, 500f, 350f), Custom.SCurve(Mathf.InverseLerp(85f, 20f, showEndGameMetersCounter), 0.5f));
		}
		if (movementSoundLoop == null && menu.manager.menuMic != null)
		{
			movementSoundLoop = menu.PlayLoop(SoundID.MENU_Karma_Ladder_Movement_LOOP, 0f, 1f, 1f, isBkgLoop: false);
		}
		if (movementSoundLoop != null)
		{
			movementSoundLoop.loopVolume = Mathf.InverseLerp(0f, 0.01f, Mathf.Abs(lastScroll - scroll));
			movementSoundLoop.loopPitch = Custom.LerpMap(Mathf.Abs(lastScroll - scroll), 0f, 0.03f, 0.5f, 1f, 0.8f);
			if (movementSoundLoop.slatedForDeletion)
			{
				movementSoundLoop = null;
			}
		}
		if (showEndGameMetersCounter > 0)
		{
			showEndGameMetersCounter--;
			if (showEndGameMetersCounter == 1)
			{
				endGameMeterAnimCounter = 1;
			}
			else if (showEndGameMetersCounter == 80)
			{
				menu.PlaySound(SoundID.MENU_Endgame_Meters_Power_On);
				for (int i = 0; i < endGameMeters.Count; i++)
				{
					endGameMeters[i].poweredOn = true;
					endGameMeters[i].flickerCounter = Math.Max(endGameMeters[i].flickerCounter, UnityEngine.Random.Range(12, UnityEngine.Random.Range(20, 60)));
				}
			}
		}
		if (endGameMeterAnimCounter > -1 && nextMeterToAnimate < endGameMeters.Count)
		{
			endGameMeterAnimCounter--;
			if (endGameMeterAnimCounter == 0)
			{
				endGameMeters[nextMeterToAnimate].meterAnimation = 0.01f;
				if (endGameMeters[nextMeterToAnimate].AnyChangeToShow())
				{
					if (endGameMeters[nextMeterToAnimate].meter is EndgameMeter.FloatMeter)
					{
						if ((endGameMeters[nextMeterToAnimate].meter as EndgameMeter.FloatMeter).changeDirection > 0)
						{
							menu.PlaySound(SoundID.MENU_Endgame_Float_Meter_Start_Animation_Up);
						}
						else if ((endGameMeters[nextMeterToAnimate].meter as EndgameMeter.FloatMeter).changeDirection < 0)
						{
							menu.PlaySound(SoundID.MENU_Endgame_Float_Meter_Start_Animation_Down);
						}
					}
					else
					{
						menu.PlaySound(SoundID.MENU_Endgame_Notch_Meter_Start_Animation);
					}
					endGameMeterAnimCounter = 10 + 20 / endGameMeters.Count;
				}
				else
				{
					endGameMeterAnimCounter = 1;
				}
				nextMeterToAnimate++;
			}
		}
		lastScroll = scroll;
		lastFlat = flat;
		lastCircleRad = circleRad;
		lastCircleThickness = circleThickness;
		lastSelectionGlow = selectionGlow;
		lastSelectorWhite = selectorWhite;
		lastReinforcementWhite = reinforcementWhite;
		lastReinforcementCycle = reinforcementCycle;
		lastReinforcementClamp = reinforcementClamp;
		lastReinforcementDeath = reinforcementDeath;
		lastReinforcementLines = reinforcementLines;
		lastLocalBloom = localBloom;
		float num = 0f;
		for (int j = 0; j < karmaSymbols.Count; j++)
		{
			float value = Mathf.Clamp(Mathf.Abs((float)karmaSymbols[j].displayKarma.x - scroll) / 0.75f, 0f, 1f);
			value = Mathf.InverseLerp(0.2f, 0.1f, value);
			value *= 0.3f + 0.7f * Mathf.Clamp(selectionGlow, 0f, 1f);
			num = Mathf.Max(num, value);
		}
		num = Mathf.Pow(num * 0.5f * selectionGlow, 2f);
		if (localBloom < num)
		{
			localBloom = num;
		}
		else
		{
			localBloom = Mathf.Max(num, localBloom - 1f / Mathf.Lerp(40f, 220f, localBloom));
		}
		if (menu is SleepAndDeathScreen)
		{
			localBloom *= 1f - (menu as SleepAndDeathScreen).fadeOutIllustration;
		}
		scroll += scrollVel;
		selectionGlow = Custom.LerpAndTick(selectionGlow, 1f, 0.2f, 0.0125f);
		if (reinforced)
		{
			if (phase == Phase.MovingA || phase == Phase.MovingB || phase == Phase.Deselecting || phase == Phase.CappedMovement)
			{
				reinforcementWhite = Custom.LerpAndTick(reinforcementWhite, 0f, 0.07f, 1f / 52f);
			}
			else
			{
				reinforcementWhite = Custom.LerpAndTick(reinforcementWhite, 1f, 0.11f, 1f / 52f);
			}
			reinforcementWhite = Mathf.Max(reinforcementWhite, selectorWhite);
			if (phase != Phase.ReinforceSave)
			{
				reinforcementCycle += 1f / 90f;
			}
			if (phase == Phase.MovingA || phase == Phase.MovingB)
			{
				reinforcementLines = Custom.LerpAndTick(reinforcementLines, 0f, 0.1f, 0.05f);
			}
			else
			{
				reinforcementLines = Mathf.Min(Custom.LerpAndTick(reinforcementLines, 1f, 0.1f, 0.05f), 1f - reinforcementDeath);
			}
		}
		else
		{
			reinforcementWhite = 0f;
			reinforcementLines = 0f;
		}
		circleThickness = 3f;
		selectorWhite = 0f;
		if (phase != Phase.ReinforceSave)
		{
			reinforcementClamp = 0f;
		}
		ticksInPhase++;
		if (phase == Phase.Resting)
		{
			circleRad = Custom.LerpAndTick(circleRad, 51.5f, 0.08f, 0.01f);
			flat = 1f;
			scrollVel *= 0.3f;
			scroll = Mathf.Lerp(scroll, displayKarma.x, 0.2f);
			if ((displayKarma.x != moveToKarma || (rippleMode && playerDeath && reinforced)) && startedAnimating)
			{
				NewPhase(Phase.Deselecting);
			}
		}
		else if (phase == Phase.Deselecting)
		{
			circleRad = Custom.LerpAndTick(circleRad, 55f, 0.08f, 0.01f);
			float num2 = Mathf.InverseLerp(0f, 30f, ticksInPhase);
			if (UnityEngine.Random.value < num2)
			{
				selectionGlow = Mathf.Lerp(UnityEngine.Random.value, 0f, num2);
			}
			flat = 1f - num2;
			if (num2 >= 1f)
			{
				if ((!rippleMode && moveToKarma < displayKarma.x && reinforced) || (rippleMode && playerDeath && reinforced))
				{
					if (moveToKarma < 0 && !rippleMode)
					{
						reinforcementDeath = 0.01f;
						NewPhase(Phase.CappedMovement);
					}
					else
					{
						NewPhase(Phase.ReinforceSave);
					}
				}
				else if (cappedMovement)
				{
					NewPhase(Phase.CappedMovement);
				}
				else
				{
					NewPhase(Phase.MovingA);
					scrollVel += Mathf.Sign(displayKarma.x - moveToKarma) * 0.01f;
				}
			}
		}
		else if (phase == Phase.MovingA || phase == Phase.MovingB)
		{
			bool flag = phase == Phase.MovingA;
			circleRad = Custom.LerpAndTick(circleRad, 50f, 0.1f, 0.1f);
			selectionGlow = 0f;
			float num3 = (float)moveToKarma + Mathf.Sign(moveToKarma - displayKarma.x) * -0.049f * (flag ? 1f : 0f);
			flat = 0f;
			scrollVel += (num3 - scroll) / (flag ? 400f : 3f);
			scrollVel += Mathf.Sign(num3 - scroll) * 0.001f;
			if (flag)
			{
				scrollVel *= 0.95f;
			}
			else
			{
				scrollVel *= 0.9f;
			}
			if (scroll < num3 == moveToKarma < displayKarma.x == flag)
			{
				if (flag)
				{
					NewPhase(Phase.MovingB);
				}
				else
				{
					NewPhase(Phase.Settling);
				}
			}
		}
		else if (phase == Phase.Settling)
		{
			float num2 = Mathf.InverseLerp(0f, 40f, ticksInPhase);
			scrollVel *= 0.6f;
			scroll = Mathf.Lerp(scroll, displayKarma.x, 0.2f);
			if (karmaIncreasing)
			{
				circleRad = 51.5f + Mathf.Sin(num2 * (float)Math.PI * 1.5f) * 3f + Mathf.Sin(num2 * (float)Math.PI) * 3f;
				if (!cappedMovement)
				{
					circleThickness = 3f + 3f * Mathf.Sin(Mathf.Pow(num2, 5f) * (float)Math.PI);
					selectorWhite = Mathf.InverseLerp(0.3f, 0.6f, num2);
				}
			}
			else
			{
				circleRad = 51.5f + Mathf.Sin(num2 * (float)Math.PI) * 3f;
			}
			if (karmaIncreasing)
			{
				selectionGlow = Mathf.Sin(Mathf.Pow(num2, 5f) * (float)Math.PI) * 0.4f;
				flat = 0f;
			}
			else
			{
				flat = Mathf.Lerp(flat, 1f, Mathf.Pow(num2, 4f));
				selectionGlow *= 0.9f - reinforcementDeath * 0.3f;
			}
			if (reinforced && reinforcementDeath > 0f)
			{
				selectionGlow += 0.3f * Mathf.Sin(Mathf.Pow(reinforcementDeath, 3f) * (float)Math.PI);
				circleRad += 10f * Mathf.Sin(Mathf.Pow(reinforcementDeath, 3f) * (float)Math.PI);
				reinforcementDeath = Mathf.Max(reinforcementDeath, Mathf.InverseLerp(0.2f, 0.8f, num2));
				if (reinforcementDeath >= 1f)
				{
					reinforced = false;
					hud.fadeCircles.Add(new FadeCircle(hud, 31.5f, 16f, 0.82f, 40f, 8f, DrawPos(1f), containers[FadeCircleContainer]));
					menu.PlaySound(SoundID.MENU_Karma_Ladder_Reinforcement_Dissipate_B);
				}
			}
			if (num2 >= 1f)
			{
				if (karmaIncreasing && cappedMovement)
				{
					NewPhase(Phase.CapBump);
				}
				else if (karmaIncreasing)
				{
					NewPhase(Phase.Bump);
				}
				else
				{
					NewPhase(Phase.Resting);
				}
			}
		}
		else if (phase == Phase.Bump)
		{
			scrollVel *= 0.4f;
			scroll = Mathf.Lerp(scroll, displayKarma.x, 0.2f);
			float num2 = Mathf.InverseLerp(0f, 45f, ticksInPhase);
			circleRad = 53f + Mathf.Lerp(50f, 0f, Mathf.Pow(num2, 0.13f)) - 2f * Mathf.InverseLerp(0.8f, 1f, num2);
			selectionGlow = (1f + Mathf.Sin(Mathf.Pow(num2, 0.2f) * (float)Math.PI)) * Mathf.Pow(1f - num2, 0.4f);
			flat = Mathf.Pow(num2, 0.3f);
			int num4 = (rippleMode ? (displayKarma.x - minRipple) : displayKarma.x);
			if (ticksInPhase == 4)
			{
				hud.fadeCircles.Add(new FadeCircle(hud, circleRad, 26f, 0.88f, 60f, 6f, DrawPos(1f), containers[FadeCircleContainer]));
				menu.PlaySound(SoundID.MENU_Karma_Ladder_Increase_Bump);
			}
			else if (ticksInPhase == 5)
			{
				for (int k = 0; k < karmaSymbols.Count; k++)
				{
					if (k != num4)
					{
						karmaSymbols[k].energy = 0f;
					}
				}
			}
			else if (ticksInPhase == 6)
			{
				for (int l = 0; l < karmaSymbols.Count; l++)
				{
					if (l != num4)
					{
						karmaSymbols[l].flickerCounter = Math.Max(karmaSymbols[l].flickerCounter, UnityEngine.Random.Range(12, UnityEngine.Random.Range(40, 80)));
						if (Math.Abs(l - num4) < 2)
						{
							karmaSymbols[l].flickerCounter += UnityEngine.Random.Range(20, 30);
						}
					}
				}
			}
			else if (ticksInPhase == 13)
			{
				for (int m = 0; m < endGameMeters.Count; m++)
				{
					endGameMeters[m].energy = Mathf.Lerp(0.5f, 1f, UnityEngine.Random.value) * Mathf.Lerp(1f, 0.15f, endGameMeters[m].showAsFullfilled);
				}
			}
			if (num2 >= 1f)
			{
				NewPhase(Phase.Resting);
			}
		}
		else if (phase == Phase.CappedMovement)
		{
			float num2 = Mathf.InverseLerp(0f, 15f, ticksInPhase);
			circleRad = Custom.LerpAndTick(circleRad, 50f, 0.1f, 0.1f);
			selectionGlow = 0f;
			flat = 0f;
			scrollVel *= Mathf.Lerp(1f, 0.92f, Mathf.Pow(num2, 6f));
			if (ticksInPhase == 9)
			{
				menu.PlaySound((moveToKarma > displayKarma.x) ? SoundID.MENU_Karma_Ladder_Hit_Upper_Cap : SoundID.MENU_Karma_Ladder_Hit_Lower_Cap);
			}
			if (num2 < 0.5f)
			{
				scrollVel -= Mathf.Sign(displayKarma.x - moveToKarma) * 0.001f;
			}
			else
			{
				scrollVel += Mathf.Sign(displayKarma.x - moveToKarma) * 0.001f;
			}
			if (num2 >= 1f)
			{
				moveToKarma = displayKarma.x;
				NewPhase(Phase.Settling);
			}
		}
		else if (phase == Phase.CapBump)
		{
			scrollVel *= 0.4f;
			scroll = Mathf.Lerp(scroll, displayKarma.x, 0.2f);
			float num2 = Mathf.InverseLerp(0f, 45f, ticksInPhase);
			circleRad = 53f + Mathf.Lerp(20f, 0f, Mathf.Pow(num2, 0.13f)) - 1f * Mathf.InverseLerp(0.8f, 1f, num2);
			selectionGlow = (1f + 0.5f * Mathf.Sin(Mathf.Pow(num2, 0.2f) * (float)Math.PI)) * Mathf.Pow(1f - num2, 0.4f);
			flat = Mathf.Pow(num2, 0.3f);
			if (ticksInPhase == 4)
			{
				hud.fadeCircles.Add(new FadeCircle(hud, circleRad, 16f, 0.82f, 40f, 6f, DrawPos(1f), containers[FadeCircleContainer]));
				if (ModManager.MSC && (menu.ID == MoreSlugcatsEnums.ProcessID.KarmaToMinScreen || menu.ID == MoreSlugcatsEnums.ProcessID.VengeanceGhostScreen))
				{
					menu.PlaySound(MoreSlugcatsEnums.MSCSoundID.Cap_Bump_Vengeance, 0f, 1.4f, 0.9f);
				}
				else
				{
					menu.PlaySound(SoundID.MENU_Karma_Ladder_Upper_Cap_Bump);
				}
			}
			if (num2 >= 1f)
			{
				NewPhase(Phase.Resting);
			}
		}
		else if (phase == Phase.ReinforceSave)
		{
			float num2 = Mathf.InverseLerp(0f, 35f, ticksInPhase);
			circleRad = Custom.LerpAndTick(circleRad, 50f + 20f * Mathf.Pow(reinforcementClamp, 0.2f), 0.1f, 0.1f);
			selectionGlow = 0f;
			flat = 0f;
			scrollVel *= 0.95f;
			if (num2 < 0.25f)
			{
				scrollVel += ((float)moveToKarma - scroll) / 400f;
				scrollVel += Mathf.Sign((float)moveToKarma - scroll) * 0.001f;
			}
			else
			{
				scrollVel += Mathf.Sign(displayKarma.x - moveToKarma) * 0.001f;
			}
			scroll = Custom.LerpMap(num2, 0.6f, 1f, scroll, displayKarma.x, 8f);
			if (ticksInPhase == 17)
			{
				menu.PlaySound(SoundID.MENU_Karma_Ladder_Reinforce_Save_Grab);
			}
			else if (ticksInPhase == 35)
			{
				menu.PlaySound(SoundID.MENU_Karma_Ladder_Reinforce_Save_Pull);
			}
			else if (ticksInPhase == 50)
			{
				menu.PlaySound(SoundID.MENU_Karma_Ladder_Reinforce_Save_Secure);
			}
			if (num2 > 0.2f)
			{
				reinforcementCycle = Mathf.Floor(reinforcementCycle);
				if (Mathf.Abs(scroll - (float)displayKarma.x) < 0.1f)
				{
					reinforcementClamp = Mathf.Max(0f, reinforcementClamp - 0.05f);
					if (reinforcementClamp <= 0f)
					{
						moveToKarma = displayKarma.x;
						reinforcementDeath = 0.01f;
						NewPhase(Phase.Settling);
					}
				}
				else
				{
					reinforcementClamp = Mathf.InverseLerp(0.2f, 0.5f, num2);
				}
			}
		}
		if (increaseKarmaCapMode)
		{
			if (increaseCapAnimation < 0)
			{
				increaseCapAnimation--;
				for (int n = (menu as KarmaLadderScreen).preGhostEncounterKarmaCap + 1; n < karmaSymbols.Count; n++)
				{
					karmaSymbols[n].energy = 0f;
				}
				if (increaseCapAnimation < -40)
				{
					if (displayKarma.x < (menu as KarmaLadderScreen).preGhostEncounterKarmaCap)
					{
						GoToKarma((menu as KarmaLadderScreen).preGhostEncounterKarmaCap, displayMetersOnRest: false);
					}
					else
					{
						increaseCapAnimation = (((menu as KarmaLadderScreen).preGhostEncounterKarmaCap != 4) ? 1 : 90);
					}
				}
				return;
			}
			increaseCapAnimation++;
			if (increaseCapAnimation < 1)
			{
				for (int num5 = (menu as KarmaLadderScreen).preGhostEncounterKarmaCap + 1; num5 < karmaSymbols.Count; num5++)
				{
					karmaSymbols[num5].energy = 0f;
				}
			}
			else if (increaseCapAnimation < 100)
			{
				for (int num6 = (menu as KarmaLadderScreen).preGhostEncounterKarmaCap + 1; num6 < karmaSymbols.Count; num6++)
				{
					karmaSymbols[num6].energy = 0f;
				}
				for (int num7 = 5; num7 < (menu as KarmaLadderScreen).preGhostEncounterKarmaCap + 1; num7++)
				{
					karmaSymbols[num7].energy = Mathf.InverseLerp(100f, 20f, increaseCapAnimation);
				}
			}
			else if (increaseCapAnimation == 100)
			{
				for (int num8 = 5; num8 < karmaSymbols.Count; num8++)
				{
					karmaSymbols[num8].energy = 0f;
					karmaSymbols[num8].UpdateDisplayKarma(new IntVector2(num8, displayKarmaCap));
				}
			}
			else if (increaseCapAnimation < 150)
			{
				for (int num9 = 5; num9 < karmaSymbols.Count; num9++)
				{
					karmaSymbols[num9].energy = Mathf.InverseLerp(100f, 150f, increaseCapAnimation);
				}
			}
			else if (increaseCapAnimation == 150)
			{
				GoToKarma(displayKarmaCap, displayMetersOnRest: true);
			}
			else if ((float)increaseCapAnimation == 170f)
			{
				(menu as KarmaLadderScreen).AddContinueButton(black: true);
			}
		}
		else if (goToCapMode)
		{
			GoToKarma(displayKarmaCap, displayMetersOnRest: true);
			goToCapMode = false;
			(menu as KarmaLadderScreen).AddContinueButton(black: true);
		}
		else if (ModManager.MSC && vengeanceMode)
		{
			GoToKarma(0, menu.ID == MoreSlugcatsEnums.ProcessID.VengeanceGhostScreen);
			vengeanceMode = false;
			(menu as KarmaLadderScreen).AddContinueButton(black: true);
		}
	}

	private void NewPhase(Phase nextPhase)
	{
		ticksInPhase = -1;
		if (nextPhase == Phase.Deselecting)
		{
			menu.PlaySound(SoundID.MENU_Karma_Ladder_Deselect);
		}
		else if (nextPhase == Phase.MovingA || nextPhase == Phase.CappedMovement || nextPhase == Phase.ReinforceSave)
		{
			if (ModManager.MSC && (menu as KarmaLadderScreen).saveState != null && (menu as KarmaLadderScreen).saveState.saveStateNumber == MoreSlugcatsEnums.SlugcatStatsName.Saint)
			{
				menu.PlaySound(MoreSlugcatsEnums.MSCSoundID.MENU_Karma_Ladder_Start_Moving_Saint);
			}
			else
			{
				menu.PlaySound(SoundID.MENU_Karma_Ladder_Start_Moving);
			}
		}
		else if (nextPhase == Phase.Resting)
		{
			if (displayMetersOnRest)
			{
				movementShown = true;
				showEndGameMetersCounter = 85;
			}
		}
		else if (nextPhase == Phase.Settling)
		{
			if (karmaIncreasing && !cappedMovement)
			{
				menu.PlaySound(SoundID.MENU_Karma_Ladder_Increase_Bump_Charge);
			}
			else if (reinforcementDeath > 0f)
			{
				menu.PlaySound(SoundID.MENU_Karma_Ladder_Reinforcement_Dissipate_A);
			}
			else
			{
				menu.PlaySound(SoundID.MENU_Karma_Ladder_Reselect);
			}
			displayKarma.x = moveToKarma;
			if (increaseKarmaCapMode && increaseCapAnimation < 0)
			{
				increaseCapAnimation = 0;
			}
		}
		phase = nextPhase;
	}

	public override void GrafUpdate(float timeStacker)
	{
		base.GrafUpdate(timeStacker);
		Vector2 vector = DrawPos(timeStacker);
		sprites[CircleSprite].x = vector.x;
		sprites[CircleSprite].y = vector.y;
		sprites[CircleSprite].color = HSLColor.Lerp(Menu.MenuColor(Menu.MenuColors.MediumGrey), Menu.MenuColor(Menu.MenuColors.White), Mathf.Lerp(lastSelectorWhite, selectorWhite, timeStacker)).rgb;
		float num = Mathf.Lerp(lastCircleRad, circleRad, timeStacker) + Mathf.Lerp(lastCircleThickness, circleThickness, timeStacker) * 0.5f;
		sprites[CircleSprite].scale = num / 8f;
		sprites[CircleSprite].alpha = Mathf.Lerp(lastCircleThickness, circleThickness, timeStacker) / num;
		sprites[BackgroundCircleSprite].x = vector.x;
		sprites[BackgroundCircleSprite].y = vector.y;
		float num2 = 150f;
		sprites[BackgroundCircleSprite].scale = num2 / 8f;
		sprites[BackgroundCircleSprite].alpha = 3f / num2;
		sprites[BackgroundCircleSprite].color = Menu.MenuRGB(Menu.MenuColors.DarkGrey);
		sprites[BlackFadeSprite].x = vector.x;
		sprites[BlackFadeSprite].y = vector.y;
		sprites[BlackFadeSprite].scale = 50f;
		sprites[BlackFadeSprite].color = Menu.MenuRGB(Menu.MenuColors.Black);
		sprites[LocalBloomSprite].x = vector.x;
		sprites[LocalBloomSprite].y = vector.y;
		sprites[LocalBloomSprite].scale = Mathf.Lerp(250f, 400f, Mathf.Pow(Mathf.Max(0f, Mathf.Lerp(lastLocalBloom, localBloom, timeStacker)), 3f)) * (reinforced ? 1.5f : 1f) / 8f;
		sprites[LocalBloomSprite].alpha = Mathf.Lerp(lastLocalBloom, localBloom, timeStacker);
		if ((menu as KarmaLadderScreen).hud != null && (menu as KarmaLadderScreen).hud.map != null)
		{
			sprites[BlackFadeSprite].alpha = 0.7f * Mathf.Lerp((menu as KarmaLadderScreen).hud.map.lastFade, (menu as KarmaLadderScreen).hud.map.fade, timeStacker);
		}
		else
		{
			sprites[BlackFadeSprite].alpha = 0f;
		}
		if (reinforced)
		{
			float num3 = Mathf.Lerp(lastReinforcementClamp, reinforcementClamp, timeStacker);
			float num4 = Mathf.Lerp(lastReinforcementDeath, reinforcementDeath, timeStacker);
			sprites[ReinforcementSprite].isVisible = true;
			float lrp = Mathf.Lerp(lastReinforcementWhite, reinforcementWhite, timeStacker) * (1f - num4) * Mathf.Max(0.5f + 0.5f * Mathf.Sin((float)Math.PI * 2f * Mathf.Lerp(lastReinforcementCycle, reinforcementCycle, timeStacker)), Mathf.InverseLerp(1f, 1.5f, Mathf.Lerp(lastSelectionGlow, selectionGlow, timeStacker)), Mathf.Lerp(lastSelectorWhite, selectorWhite, timeStacker), num3);
			sprites[ReinforcementSprite].color = HSLColor.Lerp(Menu.MenuColor(Menu.MenuColors.MediumGrey), Menu.MenuColor(Menu.MenuColors.White), lrp).rgb;
			float num5 = 4f + 4f * num3 + Mathf.Sin(Mathf.Pow(num4, 4f) * (float)Math.PI) * 4f;
			float a = Mathf.Lerp(31.5f, num - Mathf.Lerp(lastCircleThickness, circleThickness, timeStacker) * 0.5f, 0.5f) + num5 * 0.5f;
			a = Mathf.Lerp(a, 31.5f + num5 / 2f, num3);
			a -= 4f * Mathf.Sin(Mathf.Pow(num4, 1.5f) * (float)Math.PI);
			int index = (rippleMode ? (displayKarma.x - minRipple) : displayKarma.x);
			sprites[ReinforcementSprite].x = vector.x;
			sprites[ReinforcementSprite].y = Mathf.Lerp(vector.y, karmaSymbols[index].lastDrawY, num3);
			sprites[ReinforcementSprite].scale = a / 8f;
			sprites[ReinforcementSprite].alpha = num5 / a;
			float num6 = Mathf.Lerp(lastReinforcementLines, reinforcementLines, timeStacker);
			for (int i = 0; i < 4; i++)
			{
				sprites[ReinforcementLineSprite(i)].isVisible = true;
				Vector2 vector2 = new Vector2(vector.x, Mathf.Lerp(vector.y, karmaSymbols[index].lastDrawY, num3)) + Custom.DegToVec(-45f + 90f * (float)i) * (a - 2f);
				Vector2 vector3 = new Vector2(vector.x, karmaSymbols[index].lastDrawY);
				float num7 = Custom.CirclesCollisionTime(vector2.x, vector2.y, vector3.x, vector3.y, vector3.x - vector2.x, vector3.y - vector2.y, 0f, 30.75f);
				if (!float.IsNaN(num7))
				{
					vector3 = Vector2.Lerp(vector2, vector3, num7);
				}
				Vector2 vector4 = Custom.PerpendicularVector(vector2, vector3);
				(sprites[ReinforcementLineSprite(i)] as CustomFSprite).MoveVertice(0, vector2 - vector4 * 2f * Mathf.Pow(num6, 0.5f));
				(sprites[ReinforcementLineSprite(i)] as CustomFSprite).MoveVertice(1, vector2 + vector4 * 2f * Mathf.Pow(num6, 0.5f));
				(sprites[ReinforcementLineSprite(i)] as CustomFSprite).MoveVertice(2, vector3 + vector4 * 2f * Mathf.Pow(num6, 0.5f));
				(sprites[ReinforcementLineSprite(i)] as CustomFSprite).MoveVertice(3, vector3 - vector4 * 2f * Mathf.Pow(num6, 0.5f));
				(sprites[ReinforcementLineSprite(i)] as CustomFSprite).verticeColors[0] = Custom.RGB2RGBA(HSLColor.Lerp(Menu.MenuColor(Menu.MenuColors.MediumGrey), Menu.MenuColor(Menu.MenuColors.White), lrp).rgb, num6);
				(sprites[ReinforcementLineSprite(i)] as CustomFSprite).verticeColors[1] = Custom.RGB2RGBA(HSLColor.Lerp(Menu.MenuColor(Menu.MenuColors.MediumGrey), Menu.MenuColor(Menu.MenuColors.White), lrp).rgb, num6);
				(sprites[ReinforcementLineSprite(i)] as CustomFSprite).verticeColors[2] = Custom.RGB2RGBA(Menu.MenuColor(Menu.MenuColors.White).rgb, num6);
				(sprites[ReinforcementLineSprite(i)] as CustomFSprite).verticeColors[3] = Custom.RGB2RGBA(Menu.MenuColor(Menu.MenuColors.White).rgb, num6);
			}
		}
		else
		{
			sprites[ReinforcementSprite].isVisible = false;
			for (int j = 0; j < 4; j++)
			{
				sprites[ReinforcementLineSprite(j)].isVisible = false;
			}
		}
		float num8 = 50f;
		float num9 = 250f;
		sprites[BlackRibbonSprite].x = DrawX(timeStacker);
		sprites[BlackRibbonSprite].y = DrawY(timeStacker);
		sprites[BlackRibbonSprite].scaleX = num8 * 2f;
		sprites[BlackRibbonSprite].scaleY = 900f;
		sprites[BlackRibbonSprite].color = Menu.MenuRGB(Menu.MenuColors.Black);
		for (int k = 0; k < 4; k++)
		{
			Vector2 a2 = vector + new Vector2((k % 2 == 0) ? (0f - num8) : num8, (k < 2) ? (0f - num9) : num9);
			Vector2 b = vector + new Vector2((k % 2 == 0) ? (0f - num8) : num8, 0f);
			float num10 = Custom.CirclesCollisionTime(a2.x, a2.y, vector.x, vector.y, b.x - a2.x, b.y - a2.y, 0f, num);
			if (!float.IsNaN(num10))
			{
				b = Vector2.Lerp(a2, b, num10);
			}
			sprites[LineSprite(k, 0)].x = a2.x;
			sprites[LineSprite(k, 0)].y = a2.y;
			sprites[LineSprite(k, 0)].scaleY = (Vector2.Distance(a2, b) + Custom.LerpMap(num, 51f, 63f, 8f, 2f)) * ((k < 2) ? 1f : (-1f));
			sprites[LineSprite(k, 1)].x = a2.x;
			sprites[LineSprite(k, 1)].y = a2.y;
			sprites[LineSprite(k, 1)].scaleY = (Vector2.Distance(a2, b) + Custom.LerpMap(num, 51f, 63f, 8f, 2f)) * ((k < 2) ? 1f : (-1f)) / 200f;
		}
		for (int l = 0; l < 2; l++)
		{
			sprites[SymbolGradientSprite(l, 0)].x = vector.x;
			sprites[SymbolGradientSprite(l, 0)].y = vector.y + num9 * ((l == 0) ? (-1f) : 1f);
			sprites[SymbolGradientSprite(l, 0)].scaleX = num8 * 2f;
			sprites[SymbolGradientSprite(l, 0)].scaleY = num9 * 0.75f * ((l == 0) ? 1f : (-1f)) / 200f;
			sprites[SymbolGradientSprite(l, 1)].x = vector.x;
			sprites[SymbolGradientSprite(l, 1)].y = vector.y + num9 * ((l == 0) ? (-1f) : 1f);
			sprites[SymbolGradientSprite(l, 1)].scaleX = num8 * 2f;
			sprites[SymbolGradientSprite(l, 1)].scaleY = vector.y - ((l == 0) ? menu.manager.rainWorld.screenSize.y : 0f);
		}
	}

	public override void RemoveSprites()
	{
		base.RemoveSprites();
		for (int i = 0; i < sprites.Length; i++)
		{
			sprites[i].RemoveFromContainer();
		}
	}
}
