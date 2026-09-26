using System;
using System.Globalization;
using MoreSlugcats;
using RWCustom;
using UnityEngine;
using Watcher;

namespace HUD;

public class KarmaMeter : HudPart
{
	public FSprite karmaSprite;

	public FSprite darkFade;

	public FSprite ringSprite;

	public FSprite vectorRingSprite;

	public FSprite glowSprite;

	public Vector2 pos;

	public Vector2 lastPos;

	public int forceVisibleCounter;

	public float fade;

	public float lastFade;

	public float rad;

	public float lastRad;

	public IntVector2 displayKarma;

	public bool showAsReinforced;

	public int reinforceAnimation = -1;

	public float glowyFac;

	public float lastGlowyFac;

	public float reinforcementCycle;

	public float lastReinforcementCycle;

	private bool blinkRed;

	public int blinkRedCounter;

	private Color baseColor;

	public int timer;

	private bool notSleptWith;

	private bool ghostFade;

	private int scavDroppedTimer;

	private float wrapCreatingFlicker;

	private bool symbolDirty;

	public float Radius => rad + (showAsReinforced ? (8f * (1f - Mathf.InverseLerp(0.2f, 0.4f, hud.foodMeter.forceSleep))) : 0f);

	public bool Show
	{
		get
		{
			if (!hud.owner.RevealMap && !hud.showKarmaFoodRain && !(hud.owner.GetOwnerType() == HUD.OwnerType.CharacterSelect))
			{
				return blinkRed;
			}
			return true;
		}
	}

	public bool AnyVisibility
	{
		get
		{
			if (!Show && !(fade > 0f) && reinforceAnimation <= 0)
			{
				return forceVisibleCounter > 0;
			}
			return true;
		}
	}

	public KarmaMeter(HUD hud, FContainer fContainer, IntVector2 displayKarma, bool showAsReinforced)
		: base(hud)
	{
		this.displayKarma = displayKarma;
		this.showAsReinforced = showAsReinforced;
		displayKarma.x = Custom.IntClamp(displayKarma.x, 0, displayKarma.y);
		pos = new Vector2(Mathf.Max(55.01f, hud.rainWorld.options.SafeScreenOffset.x + 22.51f), Mathf.Max(45.01f, hud.rainWorld.options.SafeScreenOffset.y + 22.51f));
		lastPos = pos;
		rad = 22.5f;
		lastRad = rad;
		darkFade = new FSprite("Futile_White");
		darkFade.shader = hud.rainWorld.Shaders["FlatLight"];
		darkFade.color = new Color(0f, 0f, 0f);
		fContainer.AddChild(darkFade);
		if (ModManager.Watcher && hud.owner is Player && (hud.owner as Player).rippleLevel >= 1f)
		{
			karmaSprite = new FSprite(RippleSymbolSprite(small: true, (hud.owner as Player).rippleLevel));
			baseColor = RainWorld.SaturatedGold;
		}
		else if (ModManager.Watcher && displayKarma.y >= 100)
		{
			karmaSprite = new FSprite(RippleSymbolSprite(small: true, (float)displayKarma.x / 2f + 1f));
			baseColor = RainWorld.SaturatedGold;
		}
		else
		{
			karmaSprite = new FSprite(KarmaSymbolSprite(small: true, displayKarma));
			baseColor = new Color(1f, 1f, 1f);
		}
		karmaSprite.color = baseColor;
		fContainer.AddChild(karmaSprite);
		glowSprite = new FSprite("Futile_White");
		glowSprite.shader = hud.rainWorld.Shaders["FlatLight"];
		fContainer.AddChild(glowSprite);
		glowSprite.color = baseColor;
		if (ModManager.MSC)
		{
			if (base.hud.owner is Player && (base.hud.owner as Player).SlugCatClass == MoreSlugcatsEnums.SlugcatStatsName.Artificer)
			{
				notSleptWith = !showAsReinforced;
			}
			else
			{
				notSleptWith = false;
			}
		}
	}

	public static string KarmaSymbolSprite(bool small, IntVector2 k)
	{
		int min = 0;
		if (ModManager.MSC && small)
		{
			min = -1;
		}
		if (k.x < 5)
		{
			return (small ? "smallKarma" : "karma") + Mathf.Clamp(k.x, min, 4);
		}
		return (small ? "smallKarma" : "karma") + Mathf.Clamp(k.x, 5, 9) + "-" + Mathf.Clamp(k.y, k.x, 9);
	}

	public static string RippleSymbolSprite(bool small, float rippleLevel)
	{
		return string.Concat(str1: (Math.Round(rippleLevel * 2f, MidpointRounding.AwayFromZero) / 2.0).ToString("#.0", CultureInfo.InvariantCulture), str0: small ? "smallRipple" : "ripple");
	}

	public void ClearScavengerFlash()
	{
		scavDroppedTimer = 0;
	}

	public void DropScavengerFlash()
	{
		scavDroppedTimer = 20;
	}

	public override void Update()
	{
		lastPos = pos;
		lastFade = fade;
		lastRad = rad;
		lastGlowyFac = glowyFac;
		if (blinkRedCounter > 0)
		{
			blinkRedCounter--;
		}
		pos = new Vector2(Mathf.Max(55.01f, hud.rainWorld.options.SafeScreenOffset.x + 22.51f), Mathf.Max(45.01f, hud.rainWorld.options.SafeScreenOffset.y + 22.51f));
		if (hud.textPrompt != null && hud.textPrompt.foodVisibleMode == 0f)
		{
			pos.y += hud.textPrompt.LowerBorderHeight(1f);
		}
		if (fade > 0f)
		{
			glowyFac = Custom.LerpAndTick(glowyFac, fade * (showAsReinforced ? 1f : 0.9f), 0.1f, 1f / 30f);
			timer++;
		}
		else
		{
			glowyFac = 0f;
		}
		lastReinforcementCycle = reinforcementCycle;
		reinforcementCycle += 1f / 90f;
		if (hud.owner is Player && (hud.owner as Player).room != null && (hud.owner as Player).room.abstractRoom.gate && (hud.owner as Player).room.regionGate != null && (hud.owner as Player).room.regionGate.mode == RegionGate.Mode.MiddleClosed)
		{
			forceVisibleCounter = Math.Max(forceVisibleCounter, 10);
		}
		if (hud.foodMeter.downInCorner > 0f)
		{
			fade = Mathf.Max(0f, fade - 0.05f);
		}
		else if (Show)
		{
			float num = Mathf.Max((forceVisibleCounter > 0) ? 1f : 0f, 0.25f + 0.75f * ((hud.map != null) ? hud.map.fade : 0f));
			if (hud.showKarmaFoodRain)
			{
				num = 1f;
			}
			if (fade < num)
			{
				fade = Mathf.Min(num, fade + 0.1f);
			}
			else
			{
				fade = Mathf.Max(num, fade - 0.1f);
			}
		}
		else
		{
			if (forceVisibleCounter > 0)
			{
				forceVisibleCounter--;
				fade = Mathf.Min(1f, fade + 0.1f);
			}
			else
			{
				fade = Mathf.Max(0f, fade - 0.0125f);
			}
			if (hud.foodMeter.fade > 0f && fade > 0f)
			{
				fade = Mathf.Min(fade + 0.1f, hud.foodMeter.fade);
			}
		}
		bool flag = ModManager.MSC && hud.owner is Player && (hud.owner as Player).inVoidSea && (hud.owner as Player).room != null && !(hud.owner as Player).room.world.singleRoomWorld && (hud.owner as Player).Karma < 9 && (hud.owner as Player).Karma >= 0;
		if (ModManager.Watcher && hud.owner is Player && (hud.owner as Player).SlugCatClass == WatcherEnums.SlugcatStatsName.Watcher)
		{
			flag = false;
		}
		blinkRed = (ModManager.MSC && scavDroppedTimer > 0) || flag || blinkRedCounter > 0 || (hud.owner is Player && (hud.owner as Player).room != null && (hud.owner as Player).room.regionGate != null && (hud.owner as Player).room.regionGate.KarmaBlinkRed());
		hud.rainWorld.processManager.fakeGlitchedEnding = flag;
		if (hud.HideGeneralHud)
		{
			fade = 0f;
		}
		rad = Custom.LerpAndTick(rad, Custom.LerpMap(fade, 0f, 0.15f, 17f, 22.5f, 1.3f), 0.12f, 0.1f);
		if (blinkRed && timer % 30 > 15)
		{
			if (timer % 30 < 20)
			{
				rad *= 0.98f;
			}
			karmaSprite.color = new Color(1f, 0f, 0f);
			if (ringSprite != null)
			{
				ringSprite.color = new Color(1f, 0f, 0f);
			}
			glowSprite.color = new Color(1f, 0f, 0f);
		}
		else if (hud.owner is Player player && player.SlugCatClass == WatcherEnums.SlugcatStatsName.Watcher && player.activateDynamicWarpTimer > 5)
		{
			forceVisibleCounter = Math.Max(forceVisibleCounter, 10);
			float num2 = player.rippleLevel / 5f;
			float num3 = (float)player.activateDynamicWarpTimer / (float)player.activateDynamicWarpDuration;
			float num4 = Mathf.Pow(num3, 3f);
			Color color = Color.Lerp(baseColor, Color.white, ((Mathf.Max(Mathf.Sin(wrapCreatingFlicker), -1f) + 1f) / 2f * (1f - num4) * num3 + num4) * (num2 - 0.4f) / 0.6f);
			if (showAsReinforced)
			{
				pos += UnityEngine.Random.insideUnitCircle * (num4 * num3 * 5f * (num2 - 0.4f)) / 0.6f;
			}
			else
			{
				num2 = 0.4f;
				pos += Custom.RNV() * (num4 * num3 * 5f);
				color = Color.Lerp(baseColor, new Color(1f, 0f, 0f), num4 * 0.5f);
			}
			wrapCreatingFlicker += num3 * 1.5f * num2;
			rad = Mathf.Lerp(rad, rad * (1f - num4) + 15f * num4, num3 * (num2 - 0.2f) / 0.6f);
			karmaSprite.color = color;
			if (ringSprite != null)
			{
				ringSprite.color = color;
			}
			glowSprite.color = color;
		}
		else
		{
			karmaSprite.color = baseColor;
			if (ringSprite != null)
			{
				ringSprite.color = baseColor;
			}
			glowSprite.color = baseColor;
		}
		if (reinforceAnimation > -1)
		{
			rad = Custom.LerpMap(fade, 0f, 0.15f, 17f, 22.5f, 1.3f);
			forceVisibleCounter = Math.Max(forceVisibleCounter, 200);
			reinforceAnimation++;
			if (reinforceAnimation == 20)
			{
				hud.PlaySound(SoundID.HUD_Karma_Reinforce_Flicker);
			}
			if (reinforceAnimation > 20 && reinforceAnimation < 100)
			{
				glowyFac = 1f + Mathf.Lerp(-1f, 1f, UnityEngine.Random.value) * 0.03f * Mathf.InverseLerp(20f, 100f, reinforceAnimation);
			}
			else if (reinforceAnimation == 104)
			{
				hud.fadeCircles.Add(new FadeCircle(hud, rad, 11f, 0.82f, 50f, 4f, pos, hud.fContainers[1]));
				hud.PlaySound(SoundID.HUD_Karma_Reinforce_Small_Circle);
				hud.PlaySound(SoundID.HUD_Karma_Reinforce_Contract);
			}
			else if (reinforceAnimation > 104 && reinforceAnimation < 130)
			{
				rad -= Mathf.Pow(Mathf.Sin(Mathf.InverseLerp(104f, 130f, reinforceAnimation) * (float)Math.PI), 0.5f) * 2f;
				fade = 1f - Mathf.Pow(Mathf.Sin(Mathf.InverseLerp(104f, 130f, reinforceAnimation) * (float)Math.PI), 0.5f) * 0.5f;
			}
			else if (reinforceAnimation > 130)
			{
				fade = 1f;
				rad += Mathf.Sin(Mathf.Pow(Mathf.InverseLerp(130f, 140f, reinforceAnimation), 0.2f) * (float)Math.PI) * 5f;
				if (reinforceAnimation == 134)
				{
					glowyFac = 1.7f;
				}
				else if (reinforceAnimation == 135)
				{
					if (hud.owner is Player && (hud.owner as Player).rippleLevel >= 1f)
					{
						karmaSprite.element = Futile.atlasManager.GetElementWithName(RippleSymbolSprite(small: true, (hud.owner as Player).rippleLevel));
						baseColor = RainWorld.SaturatedGold;
						karmaSprite.color = baseColor;
					}
					else
					{
						displayKarma = new IntVector2(((hud.owner as Player).abstractCreature.world.game.session as StoryGameSession).saveState.deathPersistentSaveData.karma, ((hud.owner as Player).abstractCreature.world.game.session as StoryGameSession).saveState.deathPersistentSaveData.karmaCap);
						karmaSprite.element = Futile.atlasManager.GetElementWithName(KarmaSymbolSprite(small: true, displayKarma));
					}
					showAsReinforced = ((hud.owner as Player).abstractCreature.world.game.session as StoryGameSession).saveState.deathPersistentSaveData.reinforcedKarma;
					hud.fadeCircles.Add(new FadeCircle(hud, rad, 16f, 0.92f, 100f, 8f, pos, hud.fContainers[1]));
					hud.PlaySound(SoundID.HUD_Karma_Reinforce_Bump);
					reinforceAnimation = -1;
				}
			}
		}
		if (ModManager.MSC && hud.owner != null && hud.owner is Player && (hud.owner as Player).room != null && (hud.owner as Player).SlugCatClass == MoreSlugcatsEnums.SlugcatStatsName.Saint && (hud.owner as Player).room.world.region != null && World.CheckForRegionGhost(MoreSlugcatsEnums.SlugcatStatsName.Saint, (hud.owner as Player).room.world.region.name))
		{
			GhostWorldPresence.GhostID ghostID = GhostWorldPresence.GetGhostID((hud.owner as Player).room.world.region.name);
			ghostFade = !((hud.owner as Player).room.game.session as StoryGameSession).saveState.deathPersistentSaveData.ghostsTalkedTo.ContainsKey(ghostID) || ((hud.owner as Player).room.game.session as StoryGameSession).saveState.deathPersistentSaveData.ghostsTalkedTo[ghostID] < 2;
		}
		if (scavDroppedTimer > 0)
		{
			scavDroppedTimer--;
		}
	}

	public void UpdateGraphic()
	{
		if (hud.owner.GetOwnerType() == HUD.OwnerType.Player)
		{
			showAsReinforced = ((hud.owner as Player).abstractCreature.world.game.session as StoryGameSession).saveState.deathPersistentSaveData.reinforcedKarma;
			if ((hud.owner as Player).rippleLevel >= 1f)
			{
				karmaSprite.element = Futile.atlasManager.GetElementWithName(RippleSymbolSprite(small: true, (hud.owner as Player).rippleLevel));
				baseColor = RainWorld.SaturatedGold;
				karmaSprite.color = baseColor;
				return;
			}
			displayKarma.x = (hud.owner as Player).Karma;
			displayKarma.y = (hud.owner as Player).KarmaCap;
		}
		karmaSprite.element = Futile.atlasManager.GetElementWithName(KarmaSymbolSprite(small: true, displayKarma));
	}

	public void UpdateGraphic(int karma, int cap)
	{
		if ((hud.owner as Player).rippleLevel >= 1f)
		{
			karmaSprite.element = Futile.atlasManager.GetElementWithName(RippleSymbolSprite(small: true, (hud.owner as Player).rippleLevel));
			baseColor = RainWorld.SaturatedGold;
			karmaSprite.color = baseColor;
		}
		else
		{
			displayKarma = new IntVector2(karma, cap);
			karmaSprite.element = Futile.atlasManager.GetElementWithName(KarmaSymbolSprite(small: true, displayKarma));
		}
	}

	public Vector2 DrawPos(float timeStacker)
	{
		return Vector2.Lerp(lastPos, pos, timeStacker);
	}

	public override void Draw(float timeStacker)
	{
		float num = Mathf.Lerp(lastFade, fade, timeStacker);
		if (blinkRed)
		{
			num *= 0.65f + 0.35f * Mathf.Sin(((float)timer + timeStacker) / 30f * (float)Math.PI * 2f);
		}
		if (ModManager.MSC && ghostFade)
		{
			num = num / 2f + UnityEngine.Random.value / 20f * num;
		}
		Vector2 vector = DrawPos(timeStacker);
		karmaSprite.x = vector.x;
		karmaSprite.y = vector.y;
		karmaSprite.scale = Mathf.Lerp(lastRad, rad, timeStacker) / 22.5f;
		karmaSprite.alpha = num;
		if (showAsReinforced)
		{
			if (ringSprite == null)
			{
				ringSprite = new FSprite("smallKarmaRingReinforced");
				hud.fContainers[1].AddChild(ringSprite);
				ringSprite.color = baseColor;
			}
			ringSprite.x = vector.x;
			ringSprite.y = vector.y;
			ringSprite.scale = Mathf.Lerp(lastRad, rad, timeStacker) / 22.5f;
			float num2 = Mathf.InverseLerp(0.1f, 0.85f, hud.foodMeter.forceSleep);
			ringSprite.alpha = num * Mathf.InverseLerp(0.2f, 0f, num2);
			if (ModManager.MSC && notSleptWith)
			{
				ringSprite.alpha = Mathf.Min(ringSprite.alpha, 0.35f + UnityEngine.Random.value / 10f);
			}
			if (num2 > 0f)
			{
				if (vectorRingSprite == null)
				{
					vectorRingSprite = new FSprite("Futile_White");
					vectorRingSprite.shader = hud.rainWorld.Shaders["VectorCircleFadable"];
					hud.fContainers[1].AddChild(vectorRingSprite);
				}
				vectorRingSprite.isVisible = true;
				vectorRingSprite.x = vector.x;
				vectorRingSprite.y = vector.y;
				float num3 = Mathf.Lerp(lastRad, rad, timer) + 8f + 100f * Custom.SCurve(Mathf.InverseLerp(0.2f, 1f, num2), 0.75f);
				vectorRingSprite.scale = num3 / 8f;
				float num4 = 2f * Mathf.Pow(Mathf.InverseLerp(0.4f, 0.2f, num2), 2f) + 2f * Mathf.Pow(Mathf.InverseLerp(1f, 0.2f, num2), 0.5f);
				vectorRingSprite.color = new Color(0f, 1f, num * Mathf.Pow(Mathf.InverseLerp(1f, 0.2f, num2), 3f), num4 / num3);
			}
			else if (vectorRingSprite != null)
			{
				vectorRingSprite.RemoveFromContainer();
				vectorRingSprite = null;
			}
		}
		else
		{
			if (ringSprite != null)
			{
				ringSprite.RemoveFromContainer();
				ringSprite = null;
			}
			if (vectorRingSprite != null)
			{
				vectorRingSprite.RemoveFromContainer();
				vectorRingSprite = null;
			}
		}
		darkFade.x = DrawPos(timeStacker).x;
		darkFade.y = DrawPos(timeStacker).y;
		darkFade.scaleX = 18.75f;
		darkFade.scaleY = 18.75f;
		darkFade.alpha = 0.2f * Mathf.Pow(num, 2f);
		float num5 = 0.7f + 0.3f * Mathf.Sin((float)Math.PI * 2f * Mathf.Lerp(lastReinforcementCycle, reinforcementCycle, timeStacker));
		float num6 = Mathf.Lerp(lastGlowyFac, glowyFac, timeStacker);
		num5 *= Mathf.InverseLerp(0.9f, 1f, num6);
		glowSprite.x = DrawPos(timeStacker).x;
		glowSprite.y = DrawPos(timeStacker).y;
		glowSprite.scale = (60f + 10f * num5) * num6 / 8f;
		glowSprite.alpha = (0.2f + 0.2f * num5) * num6 * Mathf.Pow(num, 2f);
	}

	public override void ClearSprites()
	{
		base.ClearSprites();
		darkFade.RemoveFromContainer();
		karmaSprite.RemoveFromContainer();
		ringSprite?.RemoveFromContainer();
		vectorRingSprite?.RemoveFromContainer();
		glowSprite?.RemoveFromContainer();
	}
}
