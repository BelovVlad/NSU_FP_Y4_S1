using RWCustom;
using UnityEngine;

namespace HUD;

public class HUDCircle
{
	public class SnapToGraphic : ExtEnum<SnapToGraphic>
	{
		public static readonly SnapToGraphic None = new SnapToGraphic("None", register: true);

		public static readonly SnapToGraphic FoodCircleA = new SnapToGraphic("FoodCircleA", register: true);

		public static readonly SnapToGraphic FoodCircleB = new SnapToGraphic("FoodCircleB", register: true);

		public static readonly SnapToGraphic deerEyeB = new SnapToGraphic("deerEyeB", register: true);

		public static readonly SnapToGraphic smallEmptyCircle = new SnapToGraphic("smallEmptyCircle", register: true);

		public static readonly SnapToGraphic karmaRing = new SnapToGraphic("karmaRing", register: true);

		public static readonly SnapToGraphic Circle4 = new SnapToGraphic("Circle4", register: true);

		public SnapToGraphic(string value, bool register = false)
			: base(value, register)
		{
		}
	}

	public HUD hud;

	public Vector2 pos;

	public Vector2 lastPos;

	public float rad;

	public float lastRad;

	public float thickness;

	public float lastThickness;

	public FSprite sprite;

	public SnapToGraphic snapGraphic;

	public float snapRad;

	public float snapThickness;

	public FShader circleShader;

	public FShader basicShader;

	public bool visible = true;

	public float fade;

	public float lastFade;

	public int color;

	public Color? forceColor;

	public bool Snapped
	{
		get
		{
			if (rad == snapRad)
			{
				return thickness == snapThickness;
			}
			return false;
		}
	}

	public HUDCircle(HUD hud, SnapToGraphic snapGraphic, FContainer container, int color)
	{
		this.hud = hud;
		pos = new Vector2(-100f, -100f);
		lastPos = pos;
		this.color = color;
		sprite = new FSprite("Futile_White");
		circleShader = hud.rainWorld.Shaders["VectorCircleFadable"];
		basicShader = hud.rainWorld.Shaders["Basic"];
		sprite.shader = circleShader;
		sprite.isVisible = false;
		container.AddChild(sprite);
		fade = 1f;
		this.snapGraphic = snapGraphic;
		if (snapGraphic == SnapToGraphic.FoodCircleA)
		{
			snapRad = 11.5f;
			snapThickness = 2f;
		}
		else if (snapGraphic == SnapToGraphic.FoodCircleB)
		{
			snapRad = 5.5f;
			snapThickness = -1f;
		}
		else if (snapGraphic == SnapToGraphic.deerEyeB)
		{
			snapRad = 2.5f;
			snapThickness = -1f;
		}
		else if (snapGraphic == SnapToGraphic.smallEmptyCircle)
		{
			snapRad = 6f;
			snapThickness = 1f;
		}
		else if (snapGraphic == SnapToGraphic.karmaRing)
		{
			snapRad = 31.5f;
			snapThickness = 4f;
		}
		else if (snapGraphic == SnapToGraphic.Circle4)
		{
			snapRad = 2f;
			snapThickness = -1f;
		}
		else
		{
			snapRad = -1f;
			snapThickness = -1f;
		}
		rad = snapRad;
		thickness = snapThickness;
	}

	public void SetToSnap()
	{
		rad = snapRad;
		thickness = snapThickness;
	}

	public void Update()
	{
		lastPos = pos;
		lastRad = rad;
		lastThickness = thickness;
		lastFade = fade;
	}

	public void Draw(float timeStacker)
	{
		Vector2 vector = Vector2.Lerp(lastPos, pos, timeStacker);
		float num = Mathf.Lerp(lastRad, rad, timeStacker);
		float num2 = Mathf.Lerp(lastThickness, thickness, timeStacker);
		if (num <= 0f || !visible || (lastFade == 0f && fade == 0f))
		{
			sprite.isVisible = false;
			return;
		}
		sprite.isVisible = true;
		if (num2 > num)
		{
			num2 = num;
		}
		sprite.x = vector.x;
		sprite.y = vector.y;
		if (num == snapRad && num2 == snapThickness)
		{
			sprite.element = Futile.atlasManager.GetElementWithName(snapGraphic.ToString());
			sprite.scale = 1f;
			sprite.alpha = 1f;
			sprite.shader = basicShader;
			sprite.alpha = Mathf.Lerp(lastFade, fade, timeStacker);
			sprite.color = Custom.FadableVectorCircleColors[color];
		}
		else
		{
			sprite.element = Futile.atlasManager.GetElementWithName("Futile_White");
			sprite.scale = num / 8f;
			if (num2 == -1f)
			{
				sprite.alpha = 1f;
			}
			else if (num > 0f)
			{
				sprite.alpha = num2 / num;
			}
			else
			{
				sprite.alpha = 0f;
			}
			sprite.shader = circleShader;
			sprite.color = new Color((float)color / 255f, 0f, Mathf.Lerp(lastFade, fade, timeStacker));
		}
		if (forceColor.HasValue)
		{
			sprite.color = forceColor.Value;
		}
	}

	public void ClearSprite()
	{
		sprite.RemoveFromContainer();
	}
}
