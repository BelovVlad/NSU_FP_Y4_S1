using UnityEngine;

namespace HUD;

public class FadeCircle
{
	public HUD hud;

	public HUDCircle circle;

	public float rad;

	public float radSpeed;

	public float lifeTime;

	public float life;

	public float thickness;

	public float radSlowDown;

	public float alphaMultiply = 0.15f;

	public bool fadeThickness = true;

	public FadeCircle(HUD hud, float rad, float radSpeed, float radSlowDown, float lifeTime, float thickness, Vector2 pos, FContainer fContainer)
	{
		this.hud = hud;
		this.rad = rad;
		this.radSpeed = radSpeed;
		this.lifeTime = lifeTime;
		this.thickness = thickness;
		this.radSlowDown = radSlowDown;
		life = 1f;
		circle = new HUDCircle(hud, HUDCircle.SnapToGraphic.None, fContainer, 0);
		circle.pos = pos;
		circle.thickness = thickness;
	}

	public void Update()
	{
		circle.lastRad = rad;
		rad += radSpeed;
		radSpeed *= radSlowDown;
		life -= 1f / lifeTime;
		circle.Update();
		circle.rad = rad;
		circle.fade = Mathf.Pow(life, 0.5f) * alphaMultiply;
		if (fadeThickness)
		{
			circle.thickness = life * thickness;
		}
	}

	public void Destroy()
	{
		circle.ClearSprite();
	}
}
