using UnityEngine;

public interface IOwnMycelia
{
	Room OwnerRoom { get; }

	Vector2 ConnectionPos(int index, float timeStacker);

	Vector2 ResetDir(int index);
}
