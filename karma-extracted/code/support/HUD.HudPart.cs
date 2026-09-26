namespace HUD;

public abstract class HudPart
{
	public HUD hud;

	public bool slatedForDeletion;

	public HudPart(HUD hud)
	{
		this.hud = hud;
	}

	public virtual void Update()
	{
	}

	public virtual void Draw(float timeStacker)
	{
	}

	public virtual void ClearSprites()
	{
	}
}
